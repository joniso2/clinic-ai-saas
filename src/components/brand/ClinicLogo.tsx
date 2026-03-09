import { Building2 } from 'lucide-react';

export function ClinicLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-7 w-7 rounded-lg' : 'h-8 w-8 rounded-xl';
  return (
    <div
      className={`flex ${box} shrink-0 items-center justify-center bg-indigo-600 text-white shadow-sm`}
      style={{ boxShadow: '0 1px 6px rgba(79,70,229,0.35)' }}
    >
      <Building2 className="h-4 w-4 shrink-0" strokeWidth={2} />
    </div>
  );
}
