-- Detalles de cada trade (todos opcionales) y fotos del gráfico.
-- Se puede ejecutar más de una vez sin romper nada.

alter table public.movements
  add column if not exists symbol text check (symbol is null or char_length(symbol) between 1 and 20),
  add column if not exists side text check (side is null or side in ('long','short')),
  add column if not exists lots numeric(12,2) check (lots is null or lots > 0),
  add column if not exists entry_price numeric(18,6) check (entry_price is null or entry_price > 0),
  add column if not exists exit_price numeric(18,6) check (exit_price is null or exit_price > 0),
  add column if not exists stop_loss numeric(18,6) check (stop_loss is null or stop_loss > 0),
  add column if not exists take_profit numeric(18,6) check (take_profit is null or take_profit > 0),
  add column if not exists risk_amount numeric(14,2) check (risk_amount is null or risk_amount > 0),
  add column if not exists setup text check (setup is null or char_length(setup) between 1 and 40),
  add column if not exists emotion text check (emotion is null or emotion in ('tranquilo','seguro','dudas','fomo','venganza','miedo')),
  add column if not exists followed_plan boolean,
  add column if not exists rating smallint check (rating is null or rating between 1 and 5),
  add column if not exists shot_path text check (shot_path is null or char_length(shot_path) <= 200);

-- Fotos del gráfico: privadas, cada usuario en su carpeta (<user_id>/<movimiento>.jpg)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trade-shots', 'trade-shots', false, 5242880, array['image/jpeg','image/png','image/heic'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "trade-shots: ver las mías" on storage.objects;
drop policy if exists "trade-shots: subir las mías" on storage.objects;
drop policy if exists "trade-shots: cambiar las mías" on storage.objects;
drop policy if exists "trade-shots: borrar las mías" on storage.objects;

create policy "trade-shots: ver las mías" on storage.objects
  for select to authenticated using (bucket_id = 'trade-shots' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "trade-shots: subir las mías" on storage.objects
  for insert to authenticated with check (bucket_id = 'trade-shots' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "trade-shots: cambiar las mías" on storage.objects
  for update to authenticated using (bucket_id = 'trade-shots' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'trade-shots' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "trade-shots: borrar las mías" on storage.objects
  for delete to authenticated using (bucket_id = 'trade-shots' and (storage.foldername(name))[1] = (select auth.uid())::text);
