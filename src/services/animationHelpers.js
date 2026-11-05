/**
 * Animation & Micro-interaction Helpers
 * E-Bike Gadai Mobile Web App
 * 
 * Provides:
 * - Haptic feedback trigger (10ms on supported devices)
 * - Stagger style calculator (only first 6 cards, 35ms stagger)
 * - FLIP helper for smooth card removal without layout shift
 * - Reduced motion detection
 */

/**
 * Checks whether user has enabled prefers-reduced-motion in OS/Browser
 */
export function isReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Triggers lightweight haptic feedback (10ms vibration)
 * Safe fallback on iOS Safari and non-vibrating devices
 */
export function triggerHaptic(type = 'light') {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'light') {
        navigator.vibrate(10);
      } else if (type === 'medium') {
        navigator.vibrate(15);
      } else if (type === 'success') {
        navigator.vibrate([10, 30, 10]);
      }
    }
  } catch (e) {
    // Graceful no-op on unsupported browsers
  }
}

/**
 * Returns stagger animation style for unit cards
 * Only animates the first 6 cards with 35ms stagger interval
 * Returns empty object if reduced motion is active or index >= 6
 */
export function getStaggerStyle(index, isStaggerActive = true) {
  if (!isStaggerActive || index >= 6 || isReducedMotion()) {
    return {};
  }
  return {
    animation: `cardEntrance var(--dur-base) var(--ease-out) both`,
    animationDelay: `${index * 35}ms`
  };
}

/**
 * FLIP Animation Helper for Card Removal:
 * Animates target card shrink & fade out (200ms),
 * then smoothly translates following sibling cards up via transform
 * WITHOUT animating height/margin/reflow.
 */
export function animateCardRemoval(cardElement, listContainerElement, onComplete) {
  if (!cardElement || isReducedMotion()) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }

  // 1. First: Record positions of all following sibling cards
  const siblings = [];
  let nextEl = cardElement.nextElementSibling;
  while (nextEl) {
    if (nextEl.nodeType === 1) {
      siblings.push({
        element: nextEl,
        initialTop: nextEl.getBoundingClientRect().top
      });
    }
    nextEl = nextEl.nextElementSibling;
  }

  // 2. Animate removed card scale down + fade out (200ms)
  cardElement.style.transition = `transform var(--dur-sheet) var(--ease-in), opacity var(--dur-fast) var(--ease-in)`;
  cardElement.style.transform = `scale(0.96)`;
  cardElement.style.opacity = '0';
  cardElement.style.pointerEvents = 'none';

  setTimeout(() => {
    // 3. Last & Invert: execute callback to mutate state, then animate siblings with translateY
    if (typeof onComplete === 'function') {
      onComplete();
    }

    // Following cards translation via Web Animations API
    requestAnimationFrame(() => {
      siblings.forEach(({ element, initialTop }) => {
        if (!element || !element.isConnected) return;
        const currentTop = element.getBoundingClientRect().top;
        const deltaY = initialTop - currentTop;
        if (deltaY !== 0) {
          element.animate(
            [
              { transform: `translateY(${deltaY}px)` },
              { transform: 'translateY(0)' }
            ],
            {
              duration: 220,
              easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
            }
          );
        }
      });
    });
  }, 200);
}
