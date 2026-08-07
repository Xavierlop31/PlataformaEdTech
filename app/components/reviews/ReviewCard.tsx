import { RatingStars } from "@/app/components/ui/RatingStars";
import type { Review } from "@/docs/contracts/types";

export function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="border-b border-surface py-4 last:border-0">
      <div className="mb-1 flex items-center gap-2">
        <RatingStars value={review.rating} />
        <span className="text-xs text-muted">
          {new Date(review.created_at).toLocaleDateString("es-AR")}
        </span>
      </div>
      {review.comment && <p className="text-sm text-foreground/90">{review.comment}</p>}
    </div>
  );
}
