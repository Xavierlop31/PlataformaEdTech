import type { Lesson } from "@/docs/contracts/types";

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-foreground">{lesson.title}</h1>
      {lesson.content_url ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-surface bg-black">
          <video
            key={lesson.id}
            src={lesson.content_url}
            controls
            className="h-full w-full"
          >
            Tu navegador no soporta video HTML5.{" "}
            <a href={lesson.content_url} className="text-papaya underline">
              Ver contenido
            </a>
          </video>
        </div>
      ) : (
        <p className="text-muted">Esta lección todavía no tiene contenido cargado.</p>
      )}
    </div>
  );
}
