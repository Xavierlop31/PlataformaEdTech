# Especificaciones Técnicas: Apex Performance Learning (EdTech v1)

Este documento contiene la arquitectura y especificaciones para la implementación de la plataforma de aprendizaje de alto rendimiento.

## 1. Stack Tecnológico
- **Frontend/Backend:** Next.js (App Router).
- **Base de Datos & Auth:** Supabase (PostgreSQL + Auth + RLS).
- **Estilos:** Tailwind CSS (Inspirado en la estética McLaren F1).

## 2. Modelo de Datos (Esquema de Base de Datos)

### Tabla: `profiles`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK, referencia a `auth.users.id` |
| `role` | text | 'instructor' o 'estudiante' (Inmutable) |
| `full_name` | text | Nombre completo |
| `created_at` | timestamptz | Fecha de creación |

### Tabla: `courses`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `instructor_id` | uuid | FK a `profiles.id` |
| `category_id` | uuid | FK a `categories.id` |
| `title` | text | Título del curso (1-200 caracteres) |
| `description` | text | Descripción larga |
| `price` | numeric | Precio (informativo en v1) |
| `is_published` | boolean | Estado de publicación |
| `created_at` | timestamptz | |

### Tabla: `lessons`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `course_id` | uuid | FK a `courses.id` |
| `title` | text | Título de la lección |
| `content_url` | text | URL del video/recurso |
| `position` | integer | Orden de la lección |

### Tabla: `enrollments`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `student_id` | uuid | FK a `profiles.id` |
| `course_id` | uuid | FK a `courses.id` |
| `unique(student_id, course_id)` | | Impide inscripciones duplicadas |

---

## 3. Guía de Estilo (Design System)

### Colores (McLaren Inspired)
- **Papaya Orange (Primario):** `#ff8700` (Usado en CTAs, botones de "Inscribirse" y acentos críticos).
- **Anthracite Carbon (Fondo):** `#131313` (Superficies principales, modo oscuro profundo).
- **Speedline Blue (Progreso):** Acentos para barras de carga y estados completados.
- **Surface Bright:** `#393939` (Tarjetas y bordes técnicos).

### Tipografía
- **Fuente:** `Sora` (Sans-serif moderna con look tecnológico).
- **Display:** Pesos audaces para encabezados que evocan velocidad.

---

## 4. Endpoints Clave de la API

| Endpoint | Método | Acción |
|---|---|---|
| `/api/courses` | GET | Listar cursos publicados |
| `/api/courses` | POST | Crear curso (Instructores) |
| `/api/courses/:id/enroll` | POST | Inscribir estudiante (Sin gate de pago v1) |
| `/api/courses/:id/lessons` | GET | Listar lecciones (Solo si está inscrito) |

---

## 5. Reglas de Seguridad (RLS)
- **Cursos:** Lectura pública si `is_published = true`. Edición solo por el `instructor_id` dueño.
- **Lecciones:** Visibles solo para estudiantes inscritos o el instructor del curso.
- **Perfiles:** Creación obligatoria tras el signup OAuth de Google.
