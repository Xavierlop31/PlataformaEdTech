export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div
        className="h-full rounded-full bg-speedline transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
