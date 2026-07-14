'use client';

import { useLenis } from './useAnimations';

/**
 * LenisProvider — Client component that initialises Lenis smooth scroll.
 * Render once in the root layout, wrapping all page content.
 */
export default function LenisProvider({ children }) {
  useLenis();
  return children;
}
