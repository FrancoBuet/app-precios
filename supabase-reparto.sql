-- Ejecutar una sola vez en el SQL Editor de Supabase.

alter table public.pedidos
add column if not exists estado_reparto text not null default 'pendiente';

alter table public.pedidos
add column if not exists forma_pago text;

alter table public.pedidos
add column if not exists nota_reparto text;

alter table public.pedidos
add column if not exists entregado_at timestamptz;

create index if not exists pedidos_estado_reparto_idx on public.pedidos (estado_reparto);
create index if not exists pedidos_forma_pago_idx on public.pedidos (forma_pago);
