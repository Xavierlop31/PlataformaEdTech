-- courses
create table courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 5000),
  price numeric(10,2) not null default 0 check (price >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_is_published_idx on courses (is_published);

alter table courses enable row level security;

create policy "courses_select_published_or_owner"
on courses for select
using ( is_published = true or auth.uid() = instructor_id );

create policy "courses_insert_owner_instructor"
on courses for insert
with check (
  auth.uid() = instructor_id
  and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'instructor')
);

create policy "courses_update_owner"
on courses for update
using ( auth.uid() = instructor_id )
with check ( auth.uid() = instructor_id );

-- RLS-C5: protección de base de datos solamente — no expuesta como
-- DELETE /api/courses/:id en v1 (decisión validada, Spec.md §5.3).
create policy "courses_delete_owner"
on courses for delete
using ( auth.uid() = instructor_id );
