export type CampaignStatus = 'sent' | 'scheduled' | 'draft' | 'sending';
export type CampaignChannel = 'sms' | 'whatsapp';
export type CampaignAudienceType = 'all' | 'custom' | 'last_visit_filter';
export type CampaignScheduleType = 'now' | 'weekly' | 'monthly' | 'auto_days_after';

export type Campaign = {
  id: string;
  created_at: string;
  channel: CampaignChannel;
  message: string;
  audience_type: CampaignAudienceType;
  audience_ids: string[];
  audience_size: number;
  schedule_type: CampaignScheduleType;
  schedule_value: string | null;
  status: CampaignStatus;
};
