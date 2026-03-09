// Reusable className string constants for the Clinic AI SaaS design system

export const btn = {
  primary: 'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-indigo-600 text-white text-[14px] font-semibold transition-all duration-150 hover:bg-indigo-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary: 'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-white text-slate-700 text-[14px] font-semibold border border-slate-200 transition-all duration-150 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost: 'inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg text-slate-600 text-[14px] font-medium transition-all duration-150 hover:bg-slate-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-300 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed',
  danger: 'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-red-600 text-white text-[14px] font-semibold transition-all duration-150 hover:bg-red-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  icon: 'inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-500 transition-all duration-150 hover:bg-slate-100 hover:text-slate-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-300 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
} as const;

export const input = 'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[14px] text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40';

export const inputLabel = 'block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5';

export const sectionGroupLabel = 'text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-3';

export const badge = {
  base: 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium',
  gray: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
  red: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400',
} as const;

export const modal = {
  backdrop: 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4',
  panel: 'relative w-full rounded-2xl bg-white dark:bg-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.06)] modal-enter',
  header: 'flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4',
  body: 'px-6 py-5',
  footer: 'flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4',
} as const;

export const table = {
  container: 'w-full overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] bg-white dark:bg-slate-900',
  header: 'bg-slate-50/70 dark:bg-slate-800/50',
  headerCell: 'px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-right',
  row: 'group border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-100',
  cell: 'px-4 py-3 text-[14px] text-slate-700 dark:text-slate-300',
} as const;

export const pageHeader = {
  wrapper: 'mb-6',
  eyebrow: 'text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]',
  title: 'mt-1 text-[28px] font-bold text-slate-900 dark:text-slate-50 leading-tight tracking-tight',
  subtitle: 'mt-1.5 text-[15px] text-slate-500 dark:text-slate-400',
} as const;

export const kpiCardCls = 'relative flex flex-col gap-3 rounded-xl bg-white dark:bg-slate-900 p-5 border-s-4 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] group overflow-hidden dark:border-slate-800/50' as const;

/** Semantic status badges mapped to canonical UI statuses */
export const statusBadge = {
  new: `${badge.base} ${badge.blue}`,
  pending: `${badge.base} ${badge.amber}`,
  closed: `${badge.base} ${badge.green}`,
  cancelled: `${badge.base} ${badge.red}`,
  disqualified: `${badge.base} ${badge.gray}`,
} as const;
