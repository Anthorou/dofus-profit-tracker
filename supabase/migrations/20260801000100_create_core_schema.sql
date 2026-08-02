-- Core schema for Dofus Profit Tracker.
-- Business rule: the HDV tax is always estimated at 2% of the initial
-- listing price. The tax is derived later and is not stored in these tables.

create extension if not exists pgcrypto;

create type public.item_source as enum ('manual', 'dofusdude');
create type public.acquisition_type as enum ('craft', 'purchase');

create table public.professions (
  id smallint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now(),

  constraint professions_name_not_blank
    check (char_length(btrim(name)) > 0)
);

insert into public.professions (name)
values
  ('Bijoutier'),
  ('Cordonnier'),
  ('Tailleur'),
  ('Forgeron'),
  ('Sculpteur'),
  ('Façonneur'),
  ('Bricoleur');

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source public.item_source not null,
  external_id bigint,
  name text not null,
  normalized_name text generated always as (lower(btrim(name))) stored,
  image_url text,
  item_type text,
  level smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint items_id_user_id_unique unique (id, user_id),
  constraint items_name_not_blank
    check (char_length(btrim(name)) > 0),
  constraint items_level_valid
    check (level is null or level between 0 and 200),
  constraint items_source_external_id_consistent
    check (
      (source = 'manual' and external_id is null)
      or
      (source = 'dofusdude' and external_id is not null)
    )
);

create unique index items_dofusdude_id_per_user_idx
  on public.items (user_id, external_id)
  where source = 'dofusdude';

create unique index items_manual_name_per_user_idx
  on public.items (user_id, normalized_name)
  where source = 'manual';

create index items_user_normalized_name_idx
  on public.items (user_id, normalized_name);

create table public.acquisition_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null,
  profession_id smallint not null references public.professions (id),
  acquisition_type public.acquisition_type not null,
  is_forgemaged boolean not null default false,
  quantity_acquired integer not null,
  acquisition_unit_cost bigint not null,
  initial_listing_unit_price bigint not null,
  current_listing_unit_price bigint not null,
  listed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint acquisition_lots_id_user_id_unique unique (id, user_id),
  constraint acquisition_lots_item_owner_fk
    foreign key (item_id, user_id)
    references public.items (id, user_id)
    on delete restrict,
  constraint acquisition_lots_quantity_positive
    check (quantity_acquired > 0),
  constraint acquisition_lots_unit_cost_non_negative
    check (acquisition_unit_cost >= 0),
  constraint acquisition_lots_initial_listing_price_positive
    check (initial_listing_unit_price > 0),
  constraint acquisition_lots_current_listing_price_positive
    check (current_listing_unit_price > 0)
);

create index acquisition_lots_user_listed_at_idx
  on public.acquisition_lots (user_id, listed_at desc);

create index acquisition_lots_user_item_idx
  on public.acquisition_lots (user_id, item_id);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  acquisition_lot_id uuid not null,
  quantity_sold integer not null,
  sale_unit_price bigint not null,
  listing_unit_price_snapshot bigint not null,
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint sales_lot_owner_fk
    foreign key (acquisition_lot_id, user_id)
    references public.acquisition_lots (id, user_id)
    on delete restrict,
  constraint sales_quantity_positive
    check (quantity_sold > 0),
  constraint sales_unit_price_positive
    check (sale_unit_price > 0),
  constraint sales_listing_snapshot_positive
    check (listing_unit_price_snapshot > 0)
);

create index sales_user_sold_at_idx
  on public.sales (user_id, sold_at desc);

create index sales_lot_idx
  on public.sales (acquisition_lot_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

create trigger acquisition_lots_set_updated_at
before update on public.acquisition_lots
for each row execute function public.set_updated_at();

create or replace function public.validate_acquisition_lot_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  sold_quantity bigint;
begin
  if new.initial_listing_unit_price <> old.initial_listing_unit_price then
    raise exception 'The initial listing price cannot be changed';
  end if;

  select coalesce(sum(s.quantity_sold), 0)
  into sold_quantity
  from public.sales as s
  where s.acquisition_lot_id = old.id;

  if new.quantity_acquired < sold_quantity then
    raise exception 'The acquired quantity cannot be lower than the quantity already sold';
  end if;

  return new;
end;
$$;

create trigger acquisition_lots_validate_update
before update on public.acquisition_lots
for each row execute function public.validate_acquisition_lot_update();

create or replace function public.validate_sale()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  acquired_quantity integer;
  current_listing_price bigint;
  already_sold bigint;
begin
  select lot.quantity_acquired, lot.current_listing_unit_price
  into acquired_quantity, current_listing_price
  from public.acquisition_lots as lot
  where lot.id = new.acquisition_lot_id
    and lot.user_id = new.user_id
  for update;

  if acquired_quantity is null then
    raise exception 'The acquisition lot does not exist or belongs to another user';
  end if;

  if tg_op = 'INSERT' then
    select coalesce(sum(s.quantity_sold), 0)
    into already_sold
    from public.sales as s
    where s.acquisition_lot_id = new.acquisition_lot_id;
  else
    select coalesce(sum(s.quantity_sold), 0)
    into already_sold
    from public.sales as s
    where s.acquisition_lot_id = new.acquisition_lot_id
      and s.id <> old.id;
  end if;

  if already_sold + new.quantity_sold > acquired_quantity then
    raise exception 'The sold quantity exceeds the remaining quantity';
  end if;

  if tg_op = 'INSERT' then
    new.listing_unit_price_snapshot = current_listing_price;
  elsif new.listing_unit_price_snapshot <> old.listing_unit_price_snapshot then
    raise exception 'The listing price snapshot cannot be changed';
  end if;

  return new;
end;
$$;

create trigger sales_validate
before insert or update on public.sales
for each row execute function public.validate_sale();

alter table public.professions enable row level security;
alter table public.items enable row level security;
alter table public.acquisition_lots enable row level security;
alter table public.sales enable row level security;

create policy "Authenticated users can read professions"
on public.professions
for select
to authenticated
using (true);

create policy "Users can read their own items"
on public.items
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own items"
on public.items
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own items"
on public.items
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own unused items"
on public.items
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own acquisition lots"
on public.acquisition_lots
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own acquisition lots"
on public.acquisition_lots
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own acquisition lots"
on public.acquisition_lots
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own acquisition lots"
on public.acquisition_lots
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own sales"
on public.sales
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own sales"
on public.sales
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own sales"
on public.sales
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own sales"
on public.sales
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.professions from anon;
revoke all on public.items from anon;
revoke all on public.acquisition_lots from anon;
revoke all on public.sales from anon;

grant select on public.professions to authenticated;
grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.acquisition_lots to authenticated;
grant select, insert, update, delete on public.sales to authenticated;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.validate_acquisition_lot_update() from public, anon, authenticated;
revoke execute on function public.validate_sale() from public, anon, authenticated;
