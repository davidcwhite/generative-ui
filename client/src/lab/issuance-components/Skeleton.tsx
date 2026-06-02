interface SkeletonProps {
  className?: string;
}

/** Generic shimmering block. Size it with width/height utility classes. */
export function SkeletonBlock({ className = '' }: SkeletonProps) {
  return <div className={`lab-shimmer rounded-md ${className}`} />;
}

/** Thin shimmering line for text placeholders. */
export function SkeletonText({ className = '' }: SkeletonProps) {
  return <div className={`lab-shimmer rounded ${className}`} />;
}

/** Circular shimmer placeholder (avatars, donut rings, badges). */
export function SkeletonCircle({ className = '' }: SkeletonProps) {
  return <div className={`lab-shimmer rounded-full ${className}`} />;
}

/**
 * Wrapper that cross-fades between a skeleton and hydrated content.
 * Keeps layout stable so nothing jumps when data lands.
 */
export function Hydrate({
  ready,
  skeleton,
  children,
}: {
  ready: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!ready) return <>{skeleton}</>;
  return <div className="lab-fade-in">{children}</div>;
}
