-- profiles: 1:1 con auth.users
-- Se crea explícitamente vía POST /api/profiles (EP-16) tras el signup OAuth,
-- NO vía trigger. El rol es inmutable en v1 (Spec.md §2, RLS-P2, EP-18).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('instructor', 'estudiante')),
  full_name text check (char_length(full_name) <= 150),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Lectura: cualquiera (incluido anon) ve full_name/role de cualquier perfil
-- (necesario para mostrar "instructor: Fulano" en EP-01/EP-03); el propio
-- usuario también ve su fila completa.
create policy "profiles_select_public"
on profiles for select
using ( true );

-- Insert: únicamente el propio usuario autenticado puede crear su fila
-- (EP-16), una sola vez (la PK id = auth.uid() ya impide duplicados).
create policy "profiles_insert_self"
on profiles for insert
with check ( auth.uid() = id );

-- Update: el propio usuario puede editar su fila, pero el trigger de abajo
-- bloquea cambios de role.
create policy "profiles_update_self"
on profiles for update
using ( auth.uid() = id )
with check ( auth.uid() = id );

-- Trigger de protección: impide mutar `role` incluso vía UPDATE directo del dueño.
create or replace function profiles_protect_role()
returns trigger as $$
begin
  if new.role is distinct from old.role then
    raise exception 'role is immutable in v1';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger profiles_role_immutable
before update on profiles
for each row execute function profiles_protect_role();
