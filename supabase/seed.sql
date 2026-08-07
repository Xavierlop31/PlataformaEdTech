-- Datos de categorías para desarrollo local (RLS-CAT1: gestión manual/admin,
-- sin endpoint de escritura en v1). Se aplica automáticamente con
-- `supabase db reset` / `supabase start`.
insert into categories (name, slug) values
  ('Programación', 'programacion'),
  ('Diseño', 'diseno'),
  ('Negocios', 'negocios'),
  ('Marketing', 'marketing'),
  ('Desarrollo Personal', 'desarrollo-personal')
on conflict (slug) do nothing;
