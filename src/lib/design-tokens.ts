// Design tokens for the Clinic AI SaaS design system
// Base unit: 4px grid

export const fontScale = {
  pageTitle: 'text-[28px] font-bold leading-tight tracking-tight',
  sectionHeader: 'text-[18px] font-semibold',
  cardTitle: 'text-[15px] font-semibold',
  body: 'text-[14px]',
  label: 'text-[13px]',
  micro: 'text-[11px]',
  tableHeader: 'text-[11px] font-semibold uppercase tracking-[0.08em]',
} as const;

export const shadows = {
  L0: 'shadow-none',
  L1: 'shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]',
  L2: 'shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]',
  L3: 'shadow-[0_10px_30px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.06)]',
} as const;

export const radius = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
} as const;

export const transition = {
  fast: 'transition-all duration-150 ease-in-out',
  base: 'transition-all duration-200 ease-in-out',
  slow: 'transition-all duration-300 ease-in-out',
} as const;
