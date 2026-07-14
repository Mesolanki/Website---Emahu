/**
 * EMAHU Premium Animation Variants
 * Framer Motion preset configs — Apple / Stripe / Linear quality
 */

// ─── SPRING CONFIGS ────────────────────────────────────────────────────────────
export const springSmooth = { type: 'spring', stiffness: 80, damping: 20, mass: 1 };
export const springSnappy = { type: 'spring', stiffness: 200, damping: 28, mass: 0.8 };
export const springBouncy = { type: 'spring', stiffness: 300, damping: 24, mass: 0.6 };
export const easeOut = [0.16, 1, 0.3, 1];

// ─── HERO SECTION ─────────────────────────────────────────────────────────────

export const heroContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const heroWord = {
  hidden: {
    opacity: 0,
    filter: 'blur(12px)',
    y: 20,
  },
  show: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: {
      duration: 0.6,
      ease: easeOut,
    },
  },
};

export const heroSubtitle = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: easeOut,
      delay: 0.35,
    },
  },
};

export const heroButtons = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: easeOut,
      delay: 0.5,
    },
  },
};

export const navbarReveal = {
  hidden: { opacity: 0, y: -32 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: easeOut,
      delay: 0.05,
    },
  },
};

// ─── SCROLL REVEAL ─────────────────────────────────────────────────────────────

export const scrollReveal = {
  hidden: { opacity: 0, y: 80, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSmooth,
  },
};

export const scrollRevealFast = {
  hidden: { opacity: 0, y: 48, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: easeOut },
  },
};

// ─── STAGGER CONTAINERS ────────────────────────────────────────────────────────

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerFast = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0,
    },
  },
};

// ─── CARDS ─────────────────────────────────────────────────────────────────────

export const cardReveal = {
  hidden: { opacity: 0, y: 60, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSmooth,
  },
};

export const cardHoverProps = {
  scale: 1.03,
  y: -8,
  rotateX: 2,
  transition: { duration: 0.3, ease: easeOut },
};

export const cardTapProps = {
  scale: 0.98,
  transition: { duration: 0.12 },
};

// ─── PORTAL BOXES ─────────────────────────────────────────────────────────────

export const portalReveal = {
  hidden: { opacity: 0, y: 60, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: easeOut },
  },
};

// ─── BUTTONS ──────────────────────────────────────────────────────────────────

export const buttonHoverProps = {
  scale: 1.05,
  transition: { duration: 0.2, ease: easeOut },
};

export const buttonTapProps = {
  scale: 0.97,
  transition: { duration: 0.1 },
};

// ─── HOW-IT-WORKS CARDS ───────────────────────────────────────────────────────

export const howCardReveal = {
  hidden: { opacity: 0, y: 64, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSmooth,
  },
};

// ─── MODAL ────────────────────────────────────────────────────────────────────

export const modalOverlay = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const modalContent = {
  hidden: { opacity: 0, scale: 0.94, y: 24 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springSnappy,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 12,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

// ─── FLOATING ELEMENTS ────────────────────────────────────────────────────────

export const floatVariant = (delay = 0, yRange = 18) => ({
  animate: {
    y: [0, -yRange, 0],
    rotate: [-1.5, 1.5, -1.5],
    transition: {
      duration: 6 + delay * 0.7,
      ease: 'easeInOut',
      repeat: Infinity,
      delay,
    },
  },
});

// ─── PAGE TRANSITION ──────────────────────────────────────────────────────────

export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.35, ease: easeOut } },
  exit: { opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } },
};

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────

export const loadingExit = {
  opacity: 0,
  scale: 1.05,
  transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] },
};
