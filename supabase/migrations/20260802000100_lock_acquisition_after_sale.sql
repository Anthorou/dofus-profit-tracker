-- Original acquisition data can be corrected until the first sale.
-- Afterward, only the current listing price may change for the remaining units.
create or replace function public.validate_acquisition_lot_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  has_sales boolean;
begin
  select exists (
    select 1
    from public.sales as sale
    where sale.acquisition_lot_id = old.id
  )
  into has_sales;

  if has_sales and row(
    new.user_id,
    new.item_id,
    new.profession_id,
    new.acquisition_type,
    new.is_forgemaged,
    new.quantity_acquired,
    new.acquisition_unit_cost,
    new.initial_listing_unit_price,
    new.listed_at,
    new.notes
  ) is distinct from row(
    old.user_id,
    old.item_id,
    old.profession_id,
    old.acquisition_type,
    old.is_forgemaged,
    old.quantity_acquired,
    old.acquisition_unit_cost,
    old.initial_listing_unit_price,
    old.listed_at,
    old.notes
  ) then
    raise exception 'Original acquisition data cannot be changed after a sale';
  end if;

  return new;
end;
$$;
