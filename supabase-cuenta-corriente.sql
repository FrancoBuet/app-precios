-- Ejecutar una sola vez en el SQL Editor de Supabase.

create table if not exists public.clientes_cuenta_corriente (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  telefono_normalizado text,
  direccion text,
  notas text,
  created_at timestamp with time zone default now()
);

alter table public.clientes_cuenta_corriente
add column if not exists telefono_normalizado text;

create table if not exists public.cuenta_corriente_movimientos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_cuenta_corriente(id) on delete cascade,
  pedido_id uuid,
  tipo text not null check (tipo in ('pedido', 'pago', 'ajuste')),
  detalle text not null,
  monto numeric not null,
  created_at timestamp with time zone default now()
);

alter table public.clientes_cuenta_corriente enable row level security;
alter table public.cuenta_corriente_movimientos enable row level security;

drop policy if exists "Permitir leer clientes cuenta corriente" on public.clientes_cuenta_corriente;
create policy "Permitir leer clientes cuenta corriente"
on public.clientes_cuenta_corriente
for select
to anon, authenticated
using (true);

drop policy if exists "Permitir crear clientes cuenta corriente" on public.clientes_cuenta_corriente;
create policy "Permitir crear clientes cuenta corriente"
on public.clientes_cuenta_corriente
for insert
to anon, authenticated
with check (true);

drop policy if exists "Permitir actualizar clientes cuenta corriente" on public.clientes_cuenta_corriente;
create policy "Permitir actualizar clientes cuenta corriente"
on public.clientes_cuenta_corriente
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Permitir eliminar clientes cuenta corriente" on public.clientes_cuenta_corriente;
create policy "Permitir eliminar clientes cuenta corriente"
on public.clientes_cuenta_corriente
for delete
to anon, authenticated
using (true);

drop policy if exists "Permitir leer movimientos cuenta corriente" on public.cuenta_corriente_movimientos;
create policy "Permitir leer movimientos cuenta corriente"
on public.cuenta_corriente_movimientos
for select
to anon, authenticated
using (true);

drop policy if exists "Permitir crear movimientos cuenta corriente" on public.cuenta_corriente_movimientos;
create policy "Permitir crear movimientos cuenta corriente"
on public.cuenta_corriente_movimientos
for insert
to anon, authenticated
with check (true);

drop policy if exists "Permitir actualizar movimientos cuenta corriente" on public.cuenta_corriente_movimientos;
create policy "Permitir actualizar movimientos cuenta corriente"
on public.cuenta_corriente_movimientos
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Permitir eliminar movimientos cuenta corriente" on public.cuenta_corriente_movimientos;
create policy "Permitir eliminar movimientos cuenta corriente"
on public.cuenta_corriente_movimientos
for delete
to anon, authenticated
using (true);

create index if not exists clientes_cc_telefono_idx on public.clientes_cuenta_corriente (telefono);
create index if not exists clientes_cc_telefono_normalizado_idx on public.clientes_cuenta_corriente (telefono_normalizado);
create index if not exists movimientos_cc_cliente_idx on public.cuenta_corriente_movimientos (cliente_id);
create index if not exists movimientos_cc_created_idx on public.cuenta_corriente_movimientos (created_at desc);
