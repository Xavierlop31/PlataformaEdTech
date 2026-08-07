-- categories: catálogo de categorías de curso
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) <= 100),
  slug text not null unique check (char_length(slug) <= 100)
);

alter table categories enable row level security;

create policy "categories_select_public"
on categories for select
using ( true );

-- Sin policy de insert/update/delete: ningún rol (`anon`/`authenticated`)
-- puede escribir categorías en v1. Gestión manual vía consola de
-- Supabase/`service_role` (RLS-CAT1, Spec.md §5.3).
