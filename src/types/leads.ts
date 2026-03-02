export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type LeadStatus = 'Pending' | 'Contacted' | 'Appointment scheduled' | 'Closed' | 'Disqualified';
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
  last_contact_date?: string | null;
  next_follow_up_date?: string | null;
  source?: LeadSource | string | null;
  // Intelligence fields
  conversation_summary?: string | null;
  urgency_level?: 'low' | 'medium' | 'high' | null;
  priority_level?: 'low' | 'medium' | 'high' | null;
  sla_deadline?: string | null;
  follow_up_recommended_at?: string | null;
  callback_recommendation?: string | null;
  // Disqualification fields
  reject_reason?: string | null;
  rejected_at?: string | null;
};

export function getDisplayPriority(lead: Lead): Priority {
  if (lead.priority) return lead.priority as Priority;
  if (lead.status === 'Pending') return 'High';
  if (lead.status === 'Contacted') return 'Medium';
  if (lead.status === 'Appointment scheduled') return 'Medium';
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
