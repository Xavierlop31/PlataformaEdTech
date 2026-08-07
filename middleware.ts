import { type NextRequest } from "next/server";
import { updateSession } from "@/app/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Corre en todas las rutas salvo assets estáticos, para que la sesión
     * siempre esté fresca antes de llegar a un Server Component/Route Handler.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
