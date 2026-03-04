/**
 * Lightweight intent classifier for incoming Discord messages.
 * Uses keyword detection to categorize user intent before passing to the AI.
 * This helps the system add context hints to the prompt and improves response quality.
 */

export type MessageIntent = 'pain' | 'booking' | 'price' | 'greeting' | 'general';

const PAIN_KEYWORDS = [
  'כאב', 'כואב', 'ב כואב', 'ב כאב', 'נפיחות', 'נפוח', 'דימום', 'מדמם',
  'שן', 'שיניים', 'חניכיים', 'עצב', 'טיפול שורש', 'שבורה', 'שבר', 'סדק',
  'חירום', 'דחוף', 'מאוד כואב', 'חזק מאוד', 'לא נסבל', 'אי אפשר לישון',
  'pain', 'hurts', 'ache', 'swelling', 'bleeding', 'emergency', 'urgent',
];

const BOOKING_KEYWORDS = [
  'תור', 'לקבוע', 'לקבוע תור', 'לזמן', 'פגישה', 'ביקור', 'להגיע', 'לבוא',
  'מתי אפשר', 'זמינות', 'פנוי', 'appointment', 'book', 'schedule', 'available',
  'בדיקה', 'ניקוי', 'טיפול', 'להיבדק',
];

const PRICE_KEYWORDS = [
  'מחיר', 'עלות', 'כמה עולה', 'כמה זה עולה', 'כמה זה', 'תעריף', 'מחירון',
  'כמה', '₪', 'שקל', 'שקלים', 'price', 'cost', 'how much', 'fee', 'charge',
];

const GREETING_KEYWORDS = [
  'היי', 'שלום', 'הי', 'בוקר טוב', 'ערב טוב', 'צהריים טוב', 'מה שלומך',
  'hello', 'hi', 'hey', 'good morning', 'good evening',
];

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function matchesAny(text: string, keywords: string[]): boolean {
  const t = normalize(text);
  return keywords.some((kw) => t.includes(normalize(kw)));
}

/**
 * Classify the intent of an incoming message.
 * Returns the most specific match; falls back to 'general'.
 */
export function classifyIntent(message: string): MessageIntent {
  if (matchesAny(message, PAIN_KEYWORDS))     return 'pain';
  if (matchesAny(message, BOOKING_KEYWORDS))  return 'booking';
  if (matchesAny(message, PRICE_KEYWORDS))    return 'price';
  if (matchesAny(message, GREETING_KEYWORDS)) return 'greeting';
  return 'general';
}

/**
 * Returns a short Hebrew context hint to prepend to the system prompt
 * so the AI knows what type of message it's handling.
 * This reduces hallucination and improves first-reply quality.
 */
export function getIntentHint(intent: MessageIntent): string {
  switch (intent) {
    case 'pain':
      return 'CONTEXT HINT: The patient is describing pain or an urgent symptom. Start with empathy and triage questions. Do NOT ask for phone before understanding the situation.\n\n';
    case 'booking':
      return 'CONTEXT HINT: The patient wants to book an appointment. Follow the booking flow: reason → name → phone → date/time.\n\n';
    case 'price':
      return 'CONTEXT HINT: The patient is asking about prices. Use ONLY the injected price list. Never invent prices.\n\n';
    case 'greeting':
      return 'CONTEXT HINT: This is a greeting or opening message. Reply warmly and ask how you can help.\n\n';
    default:
      return '';
  }
}
