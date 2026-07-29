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
    Dado que el estudiante A creó una review en el curso C
    Cuando el estudiante B intenta PATCH o DELETE sobre esa review
    Entonces la respuesta es 403 y la operación no afecta ninguna fila
    Cuando el estudiante A intenta PATCH sobre esa misma review
    Entonces la respuesta es 200 y la review queda actualizada
    Cuando el estudiante A intenta DELETE sobre esa misma review
    Entonces la respuesta es 204 y la review queda eliminada

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
