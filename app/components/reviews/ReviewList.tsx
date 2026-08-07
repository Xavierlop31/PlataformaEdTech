import type { Review } from "@/docs/contracts/types";
import { ReviewCard } from "./ReviewCard";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay reviews para este curso.</p>;
  }

  return (
    <div>
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
    </div>
  );
}
