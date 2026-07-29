// Tipos derivados 1:1 de Spec.md §5.2 (modelo de datos) y §5.4 (contrato de endpoints).
// Sin lógica ni dependencias de Supabase: solo las formas de datos que implementación debe respetar.
// Fuente de verdad: ../../Spec.md — cualquier cambio aquí debe reflejarse también allá.

// ── Entidades (Spec.md §5.2) ────────────────────────────────────────────────

export type Role = "instructor" | "estudiante";

export interface Profile {
  id: string; // uuid, references auth.users(id)
  role: Role;
  full_name: string | null;
  created_at: string; // timestamptz ISO
}

export interface Category {
  id: string; // uuid
  name: string;
  slug: string;
}

export interface Course {
  id: string; // uuid
  instructor_id: string; // uuid, references profiles(id)
  category_id: string | null; // uuid, references categories(id)
  title: string;
  description: string | null;
  price: number; // numeric(10,2)
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string; // uuid
  course_id: string; // uuid, references courses(id)
  title: string;
  content_url: string | null;
  position: number;
  created_at: string;
}

export interface Enrollment {
  id: string; // uuid
  student_id: string; // uuid, references profiles(id)
  course_id: string; // uuid, references courses(id)
  created_at: string;
}

export interface Review {
  id: string; // uuid
  student_id: string; // uuid, references profiles(id)
  course_id: string; // uuid, references courses(id)
  rating: number; // 1..5
  comment: string | null;
  created_at: string;
}

// ── DTOs de request (uno por endpoint de escritura, Spec.md §5.4) ──────────

/** EP-02 POST /api/courses */
export interface CreateCourseInput {
  title: string;
  description?: string;
  price: number;
  category_id?: string;
}

/** EP-04 PATCH /api/courses/:id */
export interface UpdateCourseInput {
  title?: string;
  description?: string;
  price?: number;
  category_id?: string | null;
  is_published?: boolean;
}

/** EP-06 POST /api/courses/:id/lessons */
export interface CreateLessonInput {
  title: string;
  content_url?: string;
  position?: number;
}

/** EP-10 POST /api/courses/:id/reviews */
export interface CreateReviewInput {
  rating: number; // 1..5
  comment?: string;
}

/** EP-12 PATCH /api/courses/:id/lessons/:lessonId (todos los campos opcionales) */
export interface UpdateLessonInput {
  title?: string;
  content_url?: string | null;
  position?: number;
}

/** EP-14 PATCH /api/courses/:id/reviews/:reviewId (todos los campos opcionales) */
export interface UpdateReviewInput {
  rating?: number; // 1..5
  comment?: string;
}

/** EP-16 POST /api/profiles — alta explícita de perfil tras signup OAuth (no vía trigger). */
export interface CreateProfileInput {
  role: Role; // elegido en el formulario de signup; inmutable luego de creado
  full_name?: string;
}

/** EP-18 PATCH /api/profiles/me — nunca incluye `role` (inmutable en v1). */
export interface UpdateProfileInput {
  full_name?: string;
}

// ── DTOs de response ─────────────────────────────────────────────────────

/** Forma estándar de error para toda la API (400/401/403/404/409). */
export interface ApiError {
  error:
    | "validation_error"
    | "unauthorized"
    | "forbidden"
    | "not_found"
    | "already_enrolled"
    | "already_reviewed"
    | "already_has_profile";
  message?: string;
}

/**
 * EP-01/EP-03: Course enriquecido con datos públicos del instructor y con el
 * agregado de reviews (F7) — el detalle no embebe el array completo de reviews,
 * eso se pide aparte vía EP-09.
 */
export interface CourseWithInstructor extends Course {
  instructor: Pick<Profile, "id" | "full_name">;
  average_rating: number | null; // null si el curso aún no tiene reviews
  review_count: number;
}

// ── Paginación (EP-01, EP-05, EP-08, EP-09) ─────────────────────────────
// No son tipos de body: se pasan como query params (?page=, ?limit=) y el
// total viene en el header de respuesta `X-Total-Count`, no en el body.
export interface PaginationQuery {
  page?: number; // default 1
  limit?: number; // default 20, máximo 100
}
