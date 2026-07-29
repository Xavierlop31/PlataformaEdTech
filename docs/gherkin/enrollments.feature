# Fuente: ../../Spec.md §5.3 "enrollments" y §5.4 EP-07..EP-08
# Correlación: cada escenario referencia su regla (@RLS-xx) y endpoint (@EP-xx) en docs/traceability.md

Feature: Inscripciones de estudiantes a cursos

  @RLS-E1 @EP-08
  Scenario: Un estudiante solo ve sus propias inscripciones
    Dado que el estudiante A está inscrito en los cursos C1 y C2
    Y el estudiante B está inscrito en el curso C3
    Cuando el estudiante A solicita GET /api/enrollments
    Entonces la respuesta es 200
    Y la lista incluye únicamente inscripciones con student_id = A
    Y la lista NO incluye la inscripción del estudiante B

  @RLS-E2 @EP-07
  Scenario: Un estudiante se inscribe por primera vez a un curso publicado
    Dado que el curso C está publicado
    Y el estudiante E no tiene una inscripción previa en el curso C
    Cuando el estudiante E solicita POST /api/courses/C/enroll
    Entonces la respuesta es 201
    Y queda creada una fila en enrollments con student_id = E y course_id = C

  @RLS-E3 @EP-07
  Scenario: Inscribirse dos veces al mismo curso devuelve 409
    Dado que el estudiante E ya está inscrito en el curso C
    Cuando el estudiante E solicita POST /api/courses/C/enroll nuevamente
    Entonces la respuesta es 409
    Y el cuerpo de la respuesta indica error "already_enrolled"
    Y no se crea una segunda fila en enrollments para (E, C)

  @RLS-E4 @EP-08
  Scenario: El instructor dueño puede ver las inscripciones de su curso, pero no las de cursos ajenos
    Dado que el curso C pertenece al instructor I
    Y el estudiante E está inscrito en el curso C
    Cuando el instructor I consulta las inscripciones del curso C
    Entonces la respuesta incluye la inscripción del estudiante E
    Dado que el curso D pertenece a otro instructor J
    Cuando el instructor I consulta las inscripciones del curso D
    Entonces la respuesta no incluye ninguna fila

  @RLS-E2 @EP-07
  Scenario: Un instructor no puede inscribirse a un curso, ni siquiera al propio
    Dado que un usuario autenticado tiene profiles.role = 'instructor'
    Y el curso C está publicado
    Cuando ese instructor solicita POST /api/courses/C/enroll
    Entonces la respuesta es 403
    Y el cuerpo de la respuesta indica error "forbidden"
    Y no se crea ninguna fila en enrollments
    Dado que el curso C pertenece a ese mismo instructor
    Cuando ese instructor solicita POST /api/courses/C/enroll sobre su propio curso
    Entonces la respuesta es 403 igualmente

  @EP-07
  Scenario: Inscribirse sin sesión devuelve 401
    Dado que no hay ninguna sesión autenticada
    Y el curso C está publicado
    Cuando se solicita POST /api/courses/C/enroll
    Entonces la respuesta es 401
    Y el cuerpo de la respuesta indica error "unauthorized"

  @EP-07
  Scenario: Inscribirse a un curso no publicado devuelve 404
    Dado que el curso C no está publicado
    Y el estudiante E no es el instructor dueño de C
    Cuando el estudiante E solicita POST /api/courses/C/enroll
    Entonces la respuesta es 404
    Y el cuerpo de la respuesta indica error "not_found"
