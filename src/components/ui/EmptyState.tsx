import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" dir="rtl">
      <div className="mb-4 rounded-2xl bg-zinc-800 p-4">
        <Icon className="h-8 w-8 text-zinc-500" />
      </div>
      <p className="text-sm font-semibold text-zinc-300">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-zinc-500 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
