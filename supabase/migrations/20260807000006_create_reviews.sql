-- reviews: reseñas de estudiantes inscritos
create table reviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  unique (student_id, course_id) -- un estudiante, una review por curso
);
create index reviews_course_id_idx on reviews (course_id);

alter table reviews enable row level security;

-- RLS-R2 + enmienda validada: además de las reviews de un curso publicado,
-- el propio autor siempre puede ver su fila (necesario para que EP-14/EP-15
-- puedan distinguir 403 de 404 aunque el curso se despublique después).
create policy "reviews_select_public"
on reviews for select
using (
  exists (select 1 from courses c where c.id = reviews.course_id and c.is_published = true)
  or auth.uid() = student_id
);

-- RLS-R1: solo estudiantes inscritos, con profiles.role = 'estudiante'
-- (decisión validada — cruce de roles, mismo criterio que RLS-E2).
create policy "reviews_insert_enrolled_student"
on reviews for insert
with check (
  auth.uid() = student_id
  and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'estudiante')
  and exists (
    select 1 from enrollments e
    where e.course_id = reviews.course_id and e.student_id = auth.uid()
  )
);

create policy "reviews_update_delete_own"
on reviews for update using ( auth.uid() = student_id ) with check ( auth.uid() = student_id );
create policy "reviews_delete_own"
on reviews for delete using ( auth.uid() = student_id );
