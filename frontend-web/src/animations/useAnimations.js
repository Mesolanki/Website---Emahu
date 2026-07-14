'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ─── LENIS SMOOTH SCROLL ─────────────────────────────────────────────────────

/**
 * Initializes Lenis smooth scrolling and syncs with GSAP ScrollTrigger.
 * Call once at the root layout level.
 */
export function useLenis() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      // CRITICAL: Don't intercept wheel events on elements that have their own
      // overflow scroll containers (like .sel-wrapper with scroll-snap).
      // This lets contained divs scroll naturally.
      prevent: (node) => {
        // Skip if element or any ancestor has data-lenis-prevent attribute
        if (node.closest && node.closest('[data-lenis-prevent]')) return true;
        // Skip if node itself scrolls (has overflow auto or scroll)
        try {
          const style = window.getComputedStyle(node);
          const oy = style.overflowY;
          if (oy === 'auto' || oy === 'scroll') return true;
        } catch (_) {}
        return false;
      },
    });

    // Store reference for cleanup
    const rafCallback = (time) => lenis.raf(time * 1000);

    // Sync Lenis with GSAP ticker for perfectly smooth animations
    gsap.ticker.add(rafCallback);
    gsap.ticker.lagSmoothing(0);

    // Sync Lenis scroll position with ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(rafCallback);
    };
  }, []);
}

// ─── REDUCED MOTION ───────────────────────────────────────────────────────────

/**
 * Returns true if user prefers reduced motion.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

// ─── MOUSE PARALLAX ───────────────────────────────────────────────────────────

/**
 * Returns { x, y } offset based on mouse position relative to center.
 * Multiply by a factor to control intensity.
 */
export function useMouseParallax(factor = 0.02) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const rafRef = useRef(null);
  const targetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion) return;

    const handleMove = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetRef.current = {
        x: (e.clientX - cx) * factor,
        y: (e.clientY - cy) * factor,
      };
    };

    // Smooth lerp on RAF
    const lerp = (a, b, n) => a + (b - a) * n;
    let currentX = 0;
    let currentY = 0;

    const animate = () => {
      currentX = lerp(currentX, targetRef.current.x, 0.06);
      currentY = lerp(currentY, targetRef.current.y, 0.06);
      setOffset({ x: currentX, y: currentY });
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [factor]);

  return offset;
}

// ─── COUNT UP ─────────────────────────────────────────────────────────────────

/**
 * Animates a number from 0 to `end` when `trigger` is true.
 * Fires only once.
 */
export function useCountUp(end, trigger, duration = 2000) {
  const [count, setCount] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!trigger || startedRef.current) return;
    startedRef.current = true;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setCount(end);
      return;
    }

    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [trigger, end, duration]);

  return count;
}

// ─── SCROLL DIRECTION ─────────────────────────────────────────────────────────

/**
 * Returns 'up' | 'down' | null based on last scroll direction.
 * Used for hide/show navbar behavior.
 */
export function useScrollDirection() {
  const [direction, setDirection] = useState(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const scrollY = window.scrollY;
      const diff = scrollY - lastScrollY.current;
      if (Math.abs(diff) > 4) {
        setDirection(diff > 0 ? 'down' : 'up');
        lastScrollY.current = scrollY;
      }
      ticking.current = false;
    };

    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(update);
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return direction;
}

// ─── GSAP HORIZONTAL SCROLL ───────────────────────────────────────────────────

/**
 * Creates a GSAP-powered horizontal scroll section.
 * @param {React.RefObject} containerRef - The scrollable horizontal track
 * @param {React.RefObject} triggerRef - The scroll trigger wrapper
 */
export function useHorizontalScroll(containerRef, triggerRef) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current || !triggerRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const track = containerRef.current;
      const scrollWidth = track.scrollWidth - track.offsetWidth;

      gsap.to(track, {
        x: -scrollWidth,
        ease: 'none',
        scrollTrigger: {
          trigger: triggerRef.current,
          start: 'top top',
          end: () => `+=${scrollWidth}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });
    });

    return () => ctx.revert();
  }, [containerRef, triggerRef]);
}
