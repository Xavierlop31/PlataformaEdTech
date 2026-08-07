-- lessons: pertenecen a un curso
-- position NO tiene unique constraint (decisión validada): se permiten
-- valores duplicados entre lecciones del mismo curso; el desempate en
-- lecturas es position asc, created_at asc.
create table lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  content_url text check (content_url is null or char_length(content_url) <= 2048),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index lessons_course_id_idx on lessons (course_id);
create index lessons_course_id_position_idx on lessons (course_id, position);

alter table lessons enable row level security;

create policy "lessons_select_enrolled_or_owner"
on lessons for select
using (
  exists (
    select 1 from enrollments e
    where e.course_id = lessons.course_id and e.student_id = auth.uid()
  )
  or exists (
    select 1 from courses c
    where c.id = lessons.course_id and c.instructor_id = auth.uid()
  )
);
-- Decisión validada — despublicar no revoca acceso: esta policy
-- deliberadamente NO chequea courses.is_published (Spec.md §5.3, nota bajo RLS-L1).

create policy "lessons_write_owner"
on lessons for all
using (
  exists (select 1 from courses c where c.id = lessons.course_id and c.instructor_id = auth.uid())
)
with check (
  exists (select 1 from courses c where c.id = lessons.course_id and c.instructor_id = auth.uid())
);
