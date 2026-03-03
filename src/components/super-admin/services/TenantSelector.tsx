'use client';

import type { TenantOption } from './types';

interface TenantSelectorProps {
  tenants: TenantOption[];
  selectedTenantId: string;
  onSelect: (tenantId: string) => void;
  loading?: boolean;
}

export function TenantSelector({
  tenants,
  selectedTenantId,
  onSelect,
  loading = false,
}: TenantSelectorProps) {
  return (
    <div dir="rtl" className="flex flex-col gap-1.5">
      <label htmlFor="tenant-select" className="text-xs font-medium text-zinc-400">
        קליניקה (Tenant)
      </label>
      <select
        id="tenant-select"
        value={selectedTenantId}
        onChange={(e) => onSelect(e.target.value)}
        disabled={loading}
        className="rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 px-4 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none min-w-[220px] disabled:opacity-60"
      >
        <option value="">— בחר קליניקה —</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name ?? t.id}
          </option>
        ))}
      </select>
    </div>
  );
}
