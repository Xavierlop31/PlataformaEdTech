# Fuente: ../../Spec.md §5.3 "courses" y §5.4 EP-01..EP-04
# Correlación: cada escenario referencia su regla (@RLS-xx) y endpoint (@EP-xx) en docs/traceability.md

Feature: Visibilidad y edición de cursos

  @RLS-C1 @EP-01
  Scenario: Un visitante anónimo ve los cursos publicados
    Dado que no hay ninguna sesión autenticada
    Y existe un curso con is_published = true
    Cuando el visitante solicita GET /api/courses
    Entonces la respuesta es 200
    Y la lista incluye ese curso

  @RLS-C2 @EP-01 @EP-03
  Scenario: Un curso no publicado no es visible para nadie excepto su dueño
    Dado que existe un curso con is_published = false perteneciente al instructor A
    Cuando el instructor B (distinto de A) solicita GET /api/courses/:id de ese curso
    Entonces la respuesta es 404
    Cuando el instructor A solicita GET /api/courses/:id de ese mismo curso
    Entonces la respuesta es 200 y devuelve el curso

  @RLS-C3 @EP-04
  Scenario: Solo el instructor dueño puede editar su curso
    Dado que existe un curso publicado perteneciente al instructor A
    Cuando el instructor B intenta PATCH /api/courses/:id sobre ese curso
    Entonces la respuesta es 403
    Cuando el instructor A intenta PATCH /api/courses/:id sobre ese mismo curso
    Entonces la respuesta es 200 y el curso queda actualizado

  @RLS-C3 @EP-04 @EP-06
  Scenario: Editar un curso ajeno publicado da 403
    Dado que existe un curso con is_published = true perteneciente al instructor A
    Cuando el instructor B (distinto de A) intenta PATCH /api/courses/:id sobre ese curso
    Entonces la respuesta es 403
    Y el cuerpo de la respuesta indica error "forbidden"

  @RLS-C3 @EP-04 @EP-06
  Scenario: Editar un curso ajeno no publicado da 404, no 403
    Dado que existe un curso con is_published = false perteneciente al instructor A
    Cuando el instructor B (distinto de A) intenta PATCH /api/courses/:id sobre ese curso
    Entonces la respuesta es 404
    Y el cuerpo de la respuesta indica error "not_found"
    Y la respuesta NO es 403 (el instructor B no puede ver que el curso existe)

  @RLS-C4 @EP-02
  Scenario: Solo un usuario con rol instructor puede crear un curso
    Dado que un usuario autenticado tiene profiles.role = 'estudiante'
    Cuando ese usuario intenta POST /api/courses
    Entonces la respuesta es 403
    Dado que un usuario autenticado tiene profiles.role = 'instructor'
    Cuando ese usuario intenta POST /api/courses con instructor_id = su propio auth.uid()
    Entonces la respuesta es 201 y el curso queda creado con is_published = false

  @RLS-C5
  Scenario: Solo el instructor dueño puede borrar su curso
    Dado que existe un curso perteneciente al instructor A
    Cuando el instructor B intenta eliminar ese curso
    Entonces la operación no afecta ninguna fila
    Cuando el instructor A intenta eliminar ese mismo curso
    Entonces la operación elimina exactamente una fila

  @RLS-C6 @EP-04
  Scenario: Publicar un curso sin lecciones es rechazado
    Dado que existe un curso perteneciente al instructor A con 0 lecciones
    Cuando el instructor A intenta PATCH /api/courses/:id con is_published = true
    Entonces la respuesta es 400
    Y el cuerpo de la respuesta indica error "validation_error"
    Y el curso permanece con is_published = false
    Dado que el instructor A agrega al menos una lección al curso
    Cuando el instructor A intenta PATCH /api/courses/:id con is_published = true nuevamente
    Entonces la respuesta es 200 y el curso queda publicado

  @EP-02
  Scenario: Crear un curso sin sesión devuelve 401
    Dado que no hay ninguna sesión autenticada
    Cuando se solicita POST /api/courses
    Entonces la respuesta es 401
    Y el cuerpo de la respuesta indica error "unauthorized"

  @EP-04
  Scenario: Editar un curso inexistente devuelve 404
    Dado que un instructor autenticado tiene sesión válida
    Y no existe ningún curso con el id solicitado
    Cuando el instructor intenta PATCH /api/courses/:id sobre ese id inexistente
    Entonces la respuesta es 404
    Y el cuerpo de la respuesta indica error "not_found"

  @EP-02
  Scenario: Crear un curso con datos inválidos devuelve 400
    Dado que un usuario autenticado tiene profiles.role = 'instructor'
    Cuando ese usuario intenta POST /api/courses con title = "" y price = -5
    Entonces la respuesta es 400
    Y el cuerpo de la respuesta indica error "validation_error"
