-- Trading Journal: esquema inicial
-- Cada usuario solo puede ver y tocar sus propias filas (Row Level Security).

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  broker text not null default '',
  market text not null check (market in ('Forex','Acciones','Cripto','Futuros','Índices','Materias primas','ETFs','Otro')),
  kind text not null check (kind in ('Real','Fondeo','Demo')),
  initial_capital numeric(14,2) not null default 0 check (initial_capital >= 0),
  color text not null default '#3D7BFF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now()
);

create table public.movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  date date not null,
  type text not null check (type in ('ganancia','perdida','comision','deposito','retiro')),
  amount numeric(14,2) not null check (amount > 0),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts (user_id);
create index movements_user_id_date_idx on public.movements (user_id, date);
create index movements_account_id_idx on public.movements (account_id);

alter table public.accounts enable row level security;
alter table public.movements enable row level security;

create policy "accounts: ver las mías" on public.accounts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "accounts: crear las mías" on public.accounts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "accounts: editar las mías" on public.accounts
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "accounts: borrar las mías" on public.accounts
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "movements: ver los míos" on public.movements
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "movements: crear en mis cuentas" on public.movements
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))
  );
create policy "movements: editar los míos" on public.movements
  for update to authenticated using ((select auth.uid()) = user_id) with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))
  );
create policy "movements: borrar los míos" on public.movements
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Apple exige poder borrar la cuenta desde la app: el usuario se elimina a sí mismo
-- (sus cuentas y movimientos caen en cascada).
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
