import { useEffect, useState, useRef } from 'react';

/**
 * Custom React hook for triggering down-to-up animations when elements enter the viewport.
 */
export function useScrollReveal(options = {}) {
  const [isRevealed, setIsRevealed] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('IntersectionObserver' in window)) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: options.threshold || 0.05,
        rootMargin: options.rootMargin || '0px 0px -40px 0px',
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      observer.disconnect();
    };
  }, [options.threshold, options.rootMargin]);

  return [ref, isRevealed];
}

/**
 * Custom React hook that tracks scroll progress (0 to 1) for scroll-linked animations.
 * Works with both window scroll AND contained overflow-y: auto/scroll containers.
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const ref = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Walk up the DOM to find the nearest scrollable ancestor.
    // Falls back to window if none is found.
    const findScrollContainer = (el) => {
      if (!el) return null;
      let parent = el.parentElement;
      while (parent && parent !== document.documentElement) {
        const style = window.getComputedStyle(parent);
        const oy = style.overflowY;
        if ((oy === 'auto' || oy === 'scroll') && parent.scrollHeight > parent.clientHeight) {
          return parent;
        }
        parent = parent.parentElement;
      }
      return null;
    };

    // getBoundingClientRect() is always viewport-relative regardless of what scrolls,
    // so the progress calculation stays the same — only the listener target changes.
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Start animating when element top enters viewport
      const start = windowHeight;
      // Complete animation when element top is 180px from viewport top
      const end = 180;

      const distance = rect.top;
      let p = 0;
      if (distance < start) {
        p = (start - distance) / (start - end);
      }
      p = Math.max(0, Math.min(1, p));
      setProgress(p);
    };

    // Defer finding the scroll container until after mount so the DOM is ready
    const timeout = setTimeout(() => {
      const scrollContainer = findScrollContainer(ref.current);
      const target = scrollContainer || window;

      target.addEventListener('scroll', handleScroll, { passive: true, capture: true });
      window.addEventListener('resize', handleScroll);
      handleScroll(); // run once immediately

      cleanupRef.current = () => {
        target.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }, 120);

    return () => {
      clearTimeout(timeout);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  return [ref, progress];
}

