# Fuente: ../../Spec.md §5.3 "categories" y §5.4 EP-11
# Correlación: cada escenario referencia su regla (@RLS-xx) y endpoint (@EP-xx) en docs/traceability.md

Feature: Catálogo de categorías

  @RLS-CAT1 @EP-11
  Scenario: Cualquiera puede listar las categorías
    Dado que no hay ninguna sesión autenticada
    Y existen categorías registradas
    Cuando el visitante solicita GET /api/categories
    Entonces la respuesta es 200
    Y la lista incluye las categorías existentes

  @RLS-CAT1
  Scenario: Ningún usuario puede crear, editar o borrar categorías vía API en v1
    Dado que un usuario autenticado tiene profiles.role = 'instructor'
    Cuando ese usuario intenta insertar/actualizar/borrar una fila en categories directamente
    Entonces la operación no afecta ninguna fila (no existe policy de escritura para authenticated/anon)
