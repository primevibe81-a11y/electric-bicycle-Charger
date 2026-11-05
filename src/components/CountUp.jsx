import React, { useState, useEffect, useRef } from 'react';
import { isReducedMotion } from '../services/animationHelpers';

/**
 * CountUp Component
 * Animates integer numbers from 0 to target value over 400ms (ease-out)
 * Uses font-variant-numeric: tabular-nums to prevent layout shift (CLS)
 * Respects prefers-reduced-motion: reduce
 */
export default function CountUp({ to, duration = 400, className = "" }) {
  const target = Number(to) || 0;
  const [displayValue, setDisplayValue] = useState(() => {
    // If reduced motion is requested, immediately start with target
    if (isReducedMotion()) return target;
    return 0;
  });

  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (isReducedMotion() || hasAnimatedRef.current) {
      setDisplayValue(target);
      return;
    }

    hasAnimatedRef.current = true;
    const startTime = performance.now();
    let frameId;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Cubic ease-out: 1 - (1 - t)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(easeOut * target);

      setDisplayValue(currentVal);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(target);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [target, duration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {displayValue}
    </span>
  );
}
