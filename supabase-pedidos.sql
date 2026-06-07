create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  estado text not null default 'nuevo',
  cliente_nombre text,
  cliente_telefono text,
  direccion text,
  notas text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  envio numeric not null default 0,
  total numeric not null default 0,
  mensaje text,
  origen text not null default 'pedido-web',
  impreso_at timestamptz
);

alter table public.pedidos enable row level security;

drop policy if exists "Permitir crear pedidos desde la web" on public.pedidos;
create policy "Permitir crear pedidos desde la web"
on public.pedidos
for insert
to anon, authenticated
with check (true);

drop policy if exists "Permitir leer pedidos en admin simple" on public.pedidos;
create policy "Permitir leer pedidos en admin simple"
on public.pedidos
for select
to anon, authenticated
using (true);

drop policy if exists "Permitir actualizar estado de pedidos" on public.pedidos;
create policy "Permitir actualizar estado de pedidos"
on public.pedidos
for update
to anon, authenticated
using (true)
with check (true);

create index if not exists pedidos_created_at_idx on public.pedidos (created_at desc);
create index if not exists pedidos_estado_idx on public.pedidos (estado);
