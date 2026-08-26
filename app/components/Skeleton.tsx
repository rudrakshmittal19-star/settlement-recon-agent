export function SkeletonRow() {
  return (
    <div className="ledger-card border border-line rounded-md p-4 bg-paperRaised">
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-4 w-32" />
      </div>
      <div className="skeleton h-3 w-3/4" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
