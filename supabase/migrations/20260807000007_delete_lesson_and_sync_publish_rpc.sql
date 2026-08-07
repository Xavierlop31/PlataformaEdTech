-- RLS-L5: borrar la última lección de un curso publicado lo auto-despublica,
-- de forma atómica. Implementado como función RPC (no como dos llamadas
-- secuenciales de supabase-js) porque PostgREST no comparte transacción
-- entre requests HTTP independientes — ver Spec.md §5.3 bajo `lessons` y
-- RNF2/RNF10.
--
-- security invoker (default): corre con los permisos del llamador, así que
-- RLS-L4 (dueño) y RLS-C3 (dueño) se siguen aplicando dentro de la función —
-- no bypasea RLS, solo agrupa dos escrituras en una única transacción real.
create or replace function delete_lesson_and_sync_publish(p_lesson_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_course_id uuid;
  v_remaining int;
begin
  select course_id into v_course_id from lessons where id = p_lesson_id;

  delete from lessons where id = p_lesson_id;
  if not found then
    -- Fallback de seguridad para una carrera genuina (la lección
    -- desapareció/cambió de dueño entre el pre-chequeo del Route Handler y
    -- esta llamada), NO el mecanismo para decidir 403 vs 404 — esa decisión
    -- ya se tomó ANTES de invocar este RPC (Spec.md §5.4bis, "Distinguir 403
    -- de 404"). Si esto se dispara, el Route Handler responde 404.
    raise exception using errcode = 'P0002', message = 'lesson_not_found_or_forbidden';
  end if;

  select count(*) into v_remaining from lessons where course_id = v_course_id;

  if v_remaining = 0 then
    update courses set is_published = false where id = v_course_id and is_published = true;
  end if;
end;
$$;
