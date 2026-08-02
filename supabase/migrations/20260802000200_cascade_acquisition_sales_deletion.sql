alter table public.sales
  drop constraint sales_lot_owner_fk;

alter table public.sales
  add constraint sales_lot_owner_fk
  foreign key (acquisition_lot_id, user_id)
  references public.acquisition_lots (id, user_id)
  on delete cascade;
