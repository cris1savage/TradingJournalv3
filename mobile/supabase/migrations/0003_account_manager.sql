-- Manager de cuentas: estado, moneda y reglas por cuenta; payouts y costes de challenge; nota del día.

alter table public.accounts
  add column status text not null default 'activa'
    check (status in ('challenge','activa','aprobada','quemada','retirada')),
  add column currency text not null default 'USD'
    check (currency in ('USD','EUR','GBP')),
  add column drawdown_type text not null default 'static'
    check (drawdown_type in ('static','trailing')),
  add column risk_per_trade_pct numeric(5,2) check (risk_per_trade_pct is null or (risk_per_trade_pct > 0 and risk_per_trade_pct <= 100)),
  add column max_trades_per_day integer check (max_trades_per_day is null or max_trades_per_day > 0),
  add column min_trading_days integer check (min_trading_days is null or min_trading_days > 0);

-- Nuevos tipos de movimiento: payout (cobro de una cuenta de fondeo) y coste (challenge, reset, suscripción)
alter table public.movements drop constraint if exists movements_type_check;
alter table public.movements add constraint movements_type_check
  check (type in ('ganancia','perdida','comision','deposito','retiro','payout','coste'));

-- Nota del día: plan, revisión, ánimo y si se siguió el plan
create table public.day_notes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  plan text not null default '' check (char_length(plan) <= 2000),
  review text not null default '' check (char_length(review) <= 2000),
  mood text check (mood is null or mood in ('tenso','fomo','normal','centrado','top')),
  followed text check (followed is null or followed in ('si','medias','no')),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.day_notes enable row level security;

create policy "day_notes: ver las mías" on public.day_notes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "day_notes: crear las mías" on public.day_notes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "day_notes: editar las mías" on public.day_notes
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "day_notes: borrar las mías" on public.day_notes
  for delete to authenticated using ((select auth.uid()) = user_id);
