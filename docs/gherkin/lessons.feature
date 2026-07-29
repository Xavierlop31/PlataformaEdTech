# Fuente: ../../Spec.md §5.3 "lessons" y §5.4 EP-05..EP-06
# Correlación: cada escenario referencia su regla (@RLS-xx) y endpoint (@EP-xx) en docs/traceability.md

Feature: Acceso a lecciones de un curso

  @RLS-L1 @EP-05
  Scenario: Un estudiante inscrito ve las lecciones del curso
    Dado que el estudiante E está inscrito en el curso C
    Y el curso C tiene una o más lecciones
    Cuando el estudiante E solicita GET /api/courses/C/lessons
    Entonces la respuesta es 200
    Y la lista incluye las lecciones del curso C

  @RLS-L2 @EP-05
  Scenario: Un estudiante NO inscrito recibe lista vacía, no un error
    Dado que el estudiante E no está inscrito en el curso C
    Y el curso C tiene una o más lecciones
    Cuando el estudiante E solicita GET /api/courses/C/lessons
    Entonces la respuesta es 200
    Y el cuerpo de la respuesta es una lista vacía []
    Y la respuesta NO es 403 ni 401

  @RLS-L2 @EP-05
  Scenario: Un visitante anónimo recibe lista vacía, no un error
    Dado que no hay ninguna sesión autenticada
    Y el curso C tiene una o más lecciones
    Cuando el visitante solicita GET /api/courses/C/lessons
    Entonces la respuesta es 200
    Y el cuerpo de la respuesta es una lista vacía []

  @RLS-L3 @EP-05
  Scenario: El instructor dueño ve las lecciones de su propio curso sin estar inscrito
    Dado que el curso C pertenece al instructor I
    Y el instructor I no tiene una fila de inscripción en el curso C
    Cuando el instructor I solicita GET /api/courses/C/lessons
    Entonces la respuesta es 200
    Y la lista incluye las lecciones del curso C

  @RLS-L4 @EP-06
  Scenario: Solo el instructor dueño puede crear lecciones en su curso
    Dado que el curso C pertenece al instructor A
    Cuando el instructor B intenta POST /api/courses/C/lessons
    Entonces la respuesta es 403
    Cuando el instructor A intenta POST /api/courses/C/lessons
    Entonces la respuesta es 201 y la lección queda creada

  @RLS-L4 @EP-12 @EP-13
  Scenario: Solo el instructor dueño puede editar o borrar una lección
    Dado que el curso C pertenece al instructor A y tiene una lección L
    Cuando el instructor B intenta PATCH /api/courses/C/lessons/L
    Entonces la respuesta es 403
    Cuando el instructor B intenta DELETE /api/courses/C/lessons/L
    Entonces la respuesta es 403
    Cuando el instructor A intenta PATCH /api/courses/C/lessons/L
    Entonces la respuesta es 200 y la lección queda actualizada
    Cuando el instructor A intenta DELETE /api/courses/C/lessons/L
    Entonces la respuesta es 204 y la lección queda eliminada

  @EP-05
  Scenario: Un curso inexistente devuelve 404, no lista vacía
    Dado que no existe ningún curso con el id solicitado
    Cuando cualquier visitante solicita GET /api/courses/:id/lessons con ese id inexistente
    Entonces la respuesta es 404
    Y el cuerpo de la respuesta indica error "not_found"

  @EP-05
  Scenario: Un curso no publicado devuelve 404 al pedir sus lecciones (salvo el dueño)
    Dado que el curso C no está publicado y pertenece al instructor A
    Cuando el estudiante E (no inscrito, curso no visible para él) solicita GET /api/courses/C/lessons
    Entonces la respuesta es 404
    Cuando el instructor A solicita GET /api/courses/C/lessons
    Entonces la respuesta es 200 y la lista incluye las lecciones del curso C

  @RLS-L5 @EP-13
  Scenario: Borrar la última lección de un curso publicado lo despublica
    Dado que el curso C está publicado y tiene exactamente una lección L
    Cuando el instructor dueño solicita DELETE /api/courses/C/lessons/L
    Entonces la respuesta es 204
    Y el curso C queda con is_published = false

  @RLS-L5 @EP-13
  Scenario: Borrar una lección que no es la última no cambia la publicación del curso
    Dado que el curso C está publicado y tiene dos o más lecciones
    Cuando el instructor dueño borra una de esas lecciones (quedando al menos 1 restante)
    Entonces la respuesta es 204
    Y el curso C sigue con is_published = true

  @EP-05 @EP-06 @EP-12
  Scenario: Dos lecciones con la misma position se desempatan por fecha de creación
    Dado que el curso C tiene la lección L1 con position 1 creada primero
    Y el curso C tiene la lección L2 con position 1 creada después (mismo position que L1)
    Cuando se solicita GET /api/courses/C/lessons
    Entonces la respuesta es 200
    Y L1 aparece antes que L2 en la lista (desempate por created_at asc)
