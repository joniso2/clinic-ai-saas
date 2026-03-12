export const SP      = { type: "spring", stiffness: 100, damping: 15, mass: 0.8 };
export const SP_FAST = { type: "spring", stiffness: 220, damping: 22, mass: 0.5 };
export const SP_SOFT = { type: "spring", stiffness: 60,  damping: 14, mass: 1   };

/** Staggered reveal — title → description → content (60 ms gap) */
export const sectionReveal = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const revealChild = {
  hidden:  { opacity: 0, y: 22, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0,  filter: "blur(0px)", transition: { ...SP } },
};

export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.93 },
  visible: { opacity: 1, scale: 1, transition: { ...SP } },
};

export const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

export const slideStep = (dir = 1) => ({
  initial: { x: dir * -52, opacity: 0, scale: 0.98 },
  animate: { x: 0,         opacity: 1, scale: 1,    transition: { ...SP } },
  exit:    { x: dir * 52,  opacity: 0, scale: 0.98, transition: { duration: 0.18 } },
});
