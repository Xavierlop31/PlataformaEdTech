-- enrollments: relación estudiante-curso
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, course_id) -- garantiza no duplicidad a nivel DB
);
create index enrollments_course_id_idx on enrollments (course_id);

alter table enrollments enable row level security;

create policy "enrollments_select_own_or_course_owner"
on enrollments for select
using (
  auth.uid() = student_id
  or exists (select 1 from courses c where c.id = enrollments.course_id and c.instructor_id = auth.uid())
);

-- RLS-E2: solo el propio estudiante, y solo si profiles.role = 'estudiante'
-- (decisión validada — cruce de roles: un instructor nunca puede tener fila
-- en enrollments, ni siquiera en su propio curso).
create policy "enrollments_insert_own"
on enrollments for insert
with check (
  auth.uid() = student_id
  and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'estudiante')
);
