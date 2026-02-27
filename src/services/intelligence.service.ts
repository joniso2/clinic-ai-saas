export type UrgencyLevel = 'low' | 'medium' | 'high';

export type IntelligenceTimestamps = {
  sla_deadline: string | null;
  follow_up_recommended_at: string | null;
};

/**
 * Deterministically computes SLA deadline and follow-up timestamp from
 * urgency_level and lead_quality_score returned by the AI.
 * Keeping timestamp logic in code (not in the AI prompt) ensures consistency.
 */
export function computeIntelligenceTimestamps(params: {
  urgency_level?: UrgencyLevel | null;
  lead_quality_score?: number | null;
}): IntelligenceTimestamps {
  const { urgency_level, lead_quality_score } = params;

  if (!urgency_level) {
    return { sla_deadline: null, follow_up_recommended_at: null };
  }

  const now = Date.now();

  // SLA deadline based on urgency
  const SLA_OFFSETS: Record<UrgencyLevel, number> = {
    high:   30 * 60 * 1000,       // 30 minutes
    medium:  4 * 60 * 60 * 1000,  // 4 hours
    low:    24 * 60 * 60 * 1000,  // 24 hours
  };

  const sla_deadline = new Date(now + SLA_OFFSETS[urgency_level]).toISOString();

  // Follow-up recommendation based on urgency + quality score
  let followUpOffsetMs: number;
  const score = lead_quality_score ?? 0;

  if (urgency_level === 'high' || score >= 70) {
    followUpOffsetMs = 4 * 60 * 60 * 1000;      // same day (~4h)
  } else if (urgency_level === 'medium') {
    followUpOffsetMs = 24 * 60 * 60 * 1000;     // next day
  } else {
    followUpOffsetMs = 48 * 60 * 60 * 1000;     // 2 days
  }

  const follow_up_recommended_at = new Date(now + followUpOffsetMs).toISOString();

  return { sla_deadline, follow_up_recommended_at };
}
