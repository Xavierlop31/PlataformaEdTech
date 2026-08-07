import { z } from "zod";

// Límites tomados literalmente de Spec.md §5.2 (mismos que los CHECK de Postgres).

const uuid = z.string().uuid();
const httpUrl = z
  .string()
  .max(2048)
  .refine((v) => /^https?:\/\//i.test(v), {
    message: "content_url debe ser una URL http(s) válida",
  });

export const createCourseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  price: z.number().min(0),
  category_id: uuid.optional(),
});

export const updateCourseSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    price: z.number().min(0).optional(),
    category_id: uuid.nullable().optional(),
    is_published: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "body vacío" });

export const createLessonSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content_url: httpUrl.optional(),
  position: z.number().int().optional(),
});

export const updateLessonSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content_url: httpUrl.nullable().optional(),
    position: z.number().int().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "body vacío" });

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(2000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "body vacío" });

export const createProfileSchema = z.object({
  role: z.enum(["instructor", "estudiante"]),
  full_name: z.string().trim().max(150).optional(),
});

// role se maneja aparte en el Route Handler (EP-18 debe RECHAZAR si viene, no solo ignorarlo).
export const updateProfileSchema = z
  .object({
    full_name: z.string().trim().max(150).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "body vacío" });
