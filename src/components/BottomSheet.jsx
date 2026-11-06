import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { isReducedMotion, triggerHaptic } from '../services/animationHelpers';

/**
 * Reusable Mobile BottomSheet Component
 * 
 * Features:
 * - Entrance: translateY(100% -> 0) in 300ms (--ease-out) + backdrop fade-in
 * - Exit: translateY(0 -> 100%) in 200ms (--ease-in)
 * - Drag-to-close with gesture velocity check (>0.5px/ms) or distance (>30% height)
 * - Spring snap-back if drag threshold not reached
 * - Body scroll locking (overflow: hidden, overscroll-behavior: contain)
 * - Escape key listener & accessibility focus management
 * - Respects prefers-reduced-motion: reduce
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  maxHeight = "90vh",
  showCloseButton = true
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const sheetRef = useRef(null);
  const triggerElementRef = useRef(null);

  // Store trigger element on open for focus return on close
  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
      setIsExiting(false);
      setDragY(0);

      // Lock body scroll
      const prevOverflow = document.body.style.overflow;
      const prevOverscroll = document.body.style.overscrollBehavior;
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'contain';

      // Move focus to sheet container
      requestAnimationFrame(() => {
        sheetRef.current?.focus();
      });

      // Escape key listener
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          handleTriggerClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.overscrollBehavior = prevOverscroll;
        window.removeEventListener('keydown', handleKeyDown);
        if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
          triggerElementRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  const handleTriggerClose = () => {
    if (isReducedMotion()) {
      onClose();
      return;
    }
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      setDragY(0);
      onClose();
    }, 200); // 200ms ease-in exit
  };

  // Touch Gesture Handlers for Drag Handle
  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
    startTimeRef.current = performance.now();
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;
    // Only permit dragging downwards
    if (deltaY > 0) {
      setDragY(deltaY);
    } else {
      // Elastic resistance when dragging upwards
      setDragY(deltaY * 0.15);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const timeElapsed = Math.max(1, performance.now() - startTimeRef.current);
    const velocity = dragY / timeElapsed; // px/ms
    const sheetHeight = sheetRef.current ? sheetRef.current.offsetHeight : 300;

    // Threshold: dragged > 30% of height OR fast flick downwards (> 0.5px/ms)
    if (dragY > sheetHeight * 0.3 || velocity > 0.5) {
      triggerHaptic('light');
      handleTriggerClose();
    } else {
      // Snap back with spring
      setDragY(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 transition-opacity duration-150 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleTriggerClose();
      }}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="w-full max-w-lg bg-white dark:bg-[#151C28] rounded-t-3xl sm:rounded-2xl shadow-sheet overflow-hidden flex flex-col focus:outline-none border-t border-slate-200 dark:border-[#232F42]"
        style={{
          maxHeight,
          transform: isExiting
            ? 'translateY(100%)'
            : dragY !== 0
            ? `translateY(${dragY}px)`
            : 'translateY(0)',
          transition: isDragging
            ? 'none'
            : isExiting
            ? 'transform 200ms cubic-bezier(0.4, 0, 1, 1)'
            : 'transform var(--dur-sheet) var(--ease-out)'
        }}
      >
        {/* Interactive Drag Handle (44px target area) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full py-3 cursor-grab active:cursor-grabbing touch-none flex justify-center items-center shrink-0 select-none"
          title="Geser ke bawah untuk menutup"
        >
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full transition-colors group-hover:bg-slate-400" />
        </div>

        {/* Header Bar */}
        {(title || Icon || showCloseButton) && (
          <div className="flex items-start justify-between px-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {Icon && (
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {title && (
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={handleTriggerClose}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center pressable shrink-0 ml-2"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}
