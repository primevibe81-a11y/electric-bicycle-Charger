import React, { useState, useRef, useEffect } from 'react';

/**
 * Mobile-First Long-Press Tooltip
 * 
 * Mengaktifkan tooltip saat elemen ditahan selama 500ms di layar sentuh
 * atau saat di-hover/focus pada perangkat desktop/mouse.
 */
export default function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
  disabled = false
}) {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  const startPressTimer = () => {
    if (disabled || !content) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 500); // 500ms long-press per spesifikasi
  };

  const cancelPressTimer = () => {
    clearTimeout(timerRef.current);
  };

  // Tutup tooltip saat pengguna scroll atau klik di luar
  useEffect(() => {
    if (!isVisible) return;

    const handleDismiss = () => setIsVisible(false);
    const autoDismissTimer = setTimeout(() => setIsVisible(false), 2500);

    window.addEventListener('scroll', handleDismiss, { passive: true });
    window.addEventListener('touchstart', handleDismiss, { passive: true });

    return () => {
      clearTimeout(autoDismissTimer);
      window.removeEventListener('scroll', handleDismiss);
      window.removeEventListener('touchstart', handleDismiss);
    };
  }, [isVisible]);

  // Posisi tooltip
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onTouchStart={startPressTimer}
      onTouchEnd={cancelPressTimer}
      onTouchMove={cancelPressTimer}
      onMouseDown={startPressTimer}
      onMouseUp={cancelPressTimer}
      onMouseLeave={cancelPressTimer}
      onMouseEnter={() => {
        if (!disabled && content && window.matchMedia('(hover: hover)').matches) {
          setIsVisible(true);
        }
      }}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}

      {isVisible && content && (
        <div
          role="tooltip"
          className={`absolute z-50 pointer-events-none whitespace-nowrap bg-slate-900/95 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg border border-slate-700/50 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-150 ${
            positionClasses[position] || positionClasses.top
          }`}
        >
          {content}
          {/* Panah tooltip kecil */}
          <div
            className={`absolute w-1.5 h-1.5 bg-slate-900 border-slate-700/50 rotate-45 ${
              position === 'top'
                ? 'top-full left-1/2 -translate-x-1/2 -mt-1 border-b border-r'
                : 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-t border-l'
            }`}
          />
        </div>
      )}
    </div>
  );
}
