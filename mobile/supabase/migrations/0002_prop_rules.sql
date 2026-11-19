-- Reglas de fondeo opcionales por cuenta (importes en la moneda del usuario)
alter table public.accounts
  add column daily_loss_limit numeric(14,2) check (daily_loss_limit is null or daily_loss_limit > 0),
  add column max_drawdown numeric(14,2) check (max_drawdown is null or max_drawdown > 0),
  add column profit_target numeric(14,2) check (profit_target is null or profit_target > 0);
