-- Ejecutar una sola vez en el SQL Editor de Supabase.
alter table public.productos
add column if not exists sin_stock boolean not null default false;

-- Los productos actuales siguen disponibles por defecto.
update public.productos
set sin_stock = false
where sin_stock is null;
