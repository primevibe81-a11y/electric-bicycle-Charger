import React from 'react';

/**
 * UnitCardSkeleton Component
 * Matches the exact geometry (~180px) and structure of the unit cards
 * Uses non-reflow transform-based shimmer to prevent Cumulative Layout Shift (CLS)
 */
export default function UnitCardSkeleton({ count = 2 }) {
  const items = Array.from({ length: count });

  return (
    <div className="space-y-3 pt-1">
      {items.map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs space-y-2.5 min-h-[178px]"
          aria-hidden="true"
        >
          {/* Row 1: Akad + Battery Indicator placeholder */}
          <div className="flex items-center justify-between">
            <div className="w-24 h-5 rounded-lg skeleton-shimmer" />
            <div className="w-16 h-5 rounded-full skeleton-shimmer" />
          </div>

          {/* Row 2: Title & Subtitle placeholder */}
          <div className="space-y-1.5 pt-0.5">
            <div className="w-3/4 h-4 rounded-lg skeleton-shimmer" />
            <div className="w-1/2 h-3.5 rounded-lg skeleton-shimmer" />
          </div>

          {/* Row 3: Badges placeholder */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="w-20 h-5 rounded-full skeleton-shimmer" />
            <div className="w-24 h-5 rounded-full skeleton-shimmer" />
          </div>

          {/* Row 4: Meta info placeholder */}
          <div className="w-40 h-3.5 rounded-lg skeleton-shimmer pt-0.5" />

          {/* Row 5: Action buttons placeholder */}
          <div className="flex items-center gap-2 pt-2">
            <div className="flex-1 h-11 rounded-xl skeleton-shimmer" />
            <div className="w-20 h-11 rounded-xl skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
