# Fuente: ../../Spec.md §5.3 "reviews" y §5.4 EP-09..EP-10
# Correlación: cada escenario referencia su regla (@RLS-xx) y endpoint (@EP-xx) en docs/traceability.md

Feature: Reviews de cursos

  @RLS-R1 @EP-10
  Scenario: Solo un estudiante inscrito puede crear una review
    Dado que el estudiante E no está inscrito en el curso C
    Cuando el estudiante E intenta POST /api/courses/C/reviews
    Entonces la respuesta es 403
    Dado que el estudiante E está inscrito en el curso C
    Cuando el estudiante E intenta POST /api/courses/C/reviews con rating 5
    Entonces la respuesta es 201 y la review queda creada

  @RLS-R2 @EP-09
  Scenario: Las reviews de un curso publicado son visibles públicamente
    Dado que no hay ninguna sesión autenticada
    Y el curso C está publicado y tiene reviews
    Cuando el visitante solicita GET /api/courses/C/reviews
    Entonces la respuesta es 200
    Y la lista incluye las reviews del curso C

  @RLS-R3 @EP-14 @EP-15
  Scenario: Un estudiante solo puede editar o borrar su propia review
    Dado que el curso C está publicado y el estudiante A creó una review en él
    Cuando el estudiante B intenta PATCH o DELETE sobre esa review
    Entonces la respuesta es 403 y la operación no afecta ninguna fila
    Cuando el estudiante A intenta PATCH sobre esa misma review
    Entonces la respuesta es 200 y la review queda actualizada
    Cuando el estudiante A intenta DELETE sobre esa misma review
    Entonces la respuesta es 204 y la review queda eliminada

  @EP-14 @EP-15
  Scenario: Editar una review inexistente devuelve 404
    Dado que no existe ninguna review con el id solicitado
    Cuando un estudiante autenticado intenta PATCH /api/courses/:id/reviews/:reviewId sobre ese id inexistente
    Entonces la respuesta es 404
    Y el cuerpo de la respuesta indica error "not_found"

  @RLS-R2 @EP-14 @EP-15
  Scenario: El autor puede leer y editar su propia review aunque el curso se despublique
    # Nota de implementación: "solicita GET de esa review (lectura propia)" no corresponde a
    # ningún EP-xx HTTP — no existe GET /api/courses/:id/reviews/:reviewId singular (solo el
    # listado EP-09, que a propósito NO expone esto, ver EP-09). Este paso verifica la policy
    # RLS-R2 directamente contra Supabase CLI local (select as user, sin pasar por un Route
    # Handler), coherente con ADR-0001. Es un chequeo de la policy en sí, no del contrato HTTP.
    Dado que el estudiante A creó una review en el curso C mientras estaba publicado
    Y el instructor dueño despublica el curso C después
    Cuando el estudiante A hace un select directo (test-only, vía Supabase CLI local) de esa review con su propia sesión
    Entonces la review sigue siendo visible para su autor a nivel de policy RLS
    Cuando el estudiante A intenta PATCH /api/courses/C/reviews/:reviewId sobre esa misma review
    Entonces la respuesta es 200, no 404 (gracias a la enmienda de RLS-R2)

  @RLS-R2 @EP-14 @EP-15
  Scenario: Editar la review de otro en un curso ya despublicado da 404, no 403
    Dado que el estudiante A creó una review en el curso C
    Y el instructor dueño despublica el curso C después
    Cuando el estudiante B (que no es el autor) intenta PATCH sobre esa review
    Entonces la respuesta es 404
    Y la respuesta NO es 403 (el estudiante B no puede ver la review de un curso no publicado)

  @RLS-R4 @EP-10
  Scenario: Un estudiante no puede dejar más de una review por curso
    Dado que el estudiante E ya dejó una review en el curso C
    Cuando el estudiante E intenta POST /api/courses/C/reviews nuevamente
    Entonces la respuesta es 409
    Y el cuerpo de la respuesta indica error "already_reviewed"

  @RLS-R1 @EP-10
  Scenario: Un instructor no puede dejar una review, ni siquiera en un curso ajeno
    Dado que un usuario autenticado tiene profiles.role = 'instructor'
    Y el curso C está publicado
    Cuando ese instructor intenta POST /api/courses/C/reviews con rating 5
    Entonces la respuesta es 403
    Y el cuerpo de la respuesta indica error "forbidden"

  @EP-10
  Scenario: Dejar una review con rating fuera de rango devuelve 400
    Dado que el estudiante E está inscrito en el curso C
    Cuando el estudiante E intenta POST /api/courses/C/reviews con rating 7
    Entonces la respuesta es 400
    Y el cuerpo de la respuesta indica error "validation_error"
