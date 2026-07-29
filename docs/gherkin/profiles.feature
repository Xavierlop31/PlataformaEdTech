# Fuente: ../../Spec.md §5.3 "profiles" y §5.4 EP-16..EP-18
# Correlación: cada escenario referencia su regla (@RLS-xx) y endpoint (@EP-xx) en docs/traceability.md
# Nota: no existe trigger de Postgres para crear profiles — la alta es explícita vía EP-16 (decisión validada).

Feature: Alta y gestión de perfiles

  @RLS-P3 @EP-16
  Scenario: Un usuario autenticado crea su perfil eligiendo su rol
    Dado que un usuario completó el signup OAuth y no tiene fila en profiles
    Cuando ese usuario solicita POST /api/profiles con role "estudiante" y full_name "Ada Lovelace"
    Entonces la respuesta es 201
    Y queda creada una fila en profiles con id = auth.uid() y role = "estudiante"

  @RLS-P3 @EP-16
  Scenario: Crear un segundo perfil para el mismo usuario devuelve 409
    Dado que el usuario U ya tiene una fila en profiles
    Cuando el usuario U solicita POST /api/profiles nuevamente
    Entonces la respuesta es 409
    Y el cuerpo de la respuesta indica error "already_has_profile"

  @EP-16
  Scenario: Crear un perfil con un rol inválido devuelve 400
    Dado que un usuario completó el signup OAuth y no tiene fila en profiles
    Cuando ese usuario solicita POST /api/profiles con role "admin"
    Entonces la respuesta es 400
    Y el cuerpo de la respuesta indica error "validation_error"

  @RLS-P1 @EP-17
  Scenario: Un usuario sin perfil recibe 404 en /profiles/me
    Dado que un usuario tiene sesión pero no ha creado su perfil
    Cuando ese usuario solicita GET /api/profiles/me
    Entonces la respuesta es 404
    Y el cuerpo de la respuesta indica error "not_found"

  @RLS-P1
  Scenario: Cualquiera puede leer el nombre y rol público de un perfil
    Dado que existe un perfil con full_name "Ada Lovelace" y role "instructor"
    Cuando un visitante anónimo consulta el detalle de un curso de ese instructor (EP-03)
    Entonces la respuesta incluye instructor.full_name = "Ada Lovelace"

  @RLS-P2 @EP-18
  Scenario: Un usuario solo puede editar su propio perfil
    Dado que existe un perfil perteneciente al usuario A
    Cuando el usuario B intenta PATCH /api/profiles/me con datos del perfil de A
    Entonces la respuesta solo afecta el perfil de B, nunca el de A
    Cuando el usuario A solicita PATCH /api/profiles/me con full_name "Nuevo Nombre"
    Entonces la respuesta es 200 y el perfil de A queda actualizado

  @RLS-P2 @EP-18
  Scenario: El rol de un perfil es inmutable
    Dado que existe un perfil con role "estudiante"
    Cuando el dueño de ese perfil solicita PATCH /api/profiles/me con role "instructor"
    Entonces la respuesta es 400
    Y el perfil conserva role = "estudiante"
