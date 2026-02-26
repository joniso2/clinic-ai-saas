export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type LeadStatus = 'New' | 'Contacted' | 'Closed';
export type LeadSource =
  | 'Google Ads'
  | 'Organic'
  | 'Referral'
  | 'WhatsApp'
  | 'Other';

export type Lead = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null;
  status: string | null;
  created_at: string;
  // Optional fields (add DB columns to persist)
  priority?: Priority | null;
  estimated_deal_value?: number | null;
  lead_score?: number | null;
  last_contact_date?: string | null;
  next_follow_up_date?: string | null;
  source?: LeadSource | string | null;
};

export function getDisplayPriority(lead: Lead): Priority {
  if (lead.priority) return lead.priority as Priority;
  if (lead.status === 'New') return 'High';
  if (lead.status === 'Contacted') return 'Medium';
  return 'Low';
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
