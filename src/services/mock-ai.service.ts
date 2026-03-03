export interface AIModelSpec {
  readonly id: string;
  readonly label: string;
  readonly provider: string;
  readonly contextWindow: number;
  readonly costPer1kInput: number;   // USD
  readonly costPer1kOutput: number;  // USD
  readonly recommended?: boolean;
}

export interface GlobalAIConfig {
  globalModel: string;
  temperature: number;         // 0.0 – 2.0
  maxTokens: number;           // 100 – 4000
  systemPrompt: string;
  safetyFilter: boolean;
  streamingEnabled: boolean;
}

export interface PromptHistoryEntry {
  readonly id: string;
  readonly tenantName: string;
  readonly model: string;
  readonly userMessage: string;
  readonly assistantResponse: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costUsd: number;
  readonly timestamp: string;
  readonly durationMs: number;
}

export const AI_MODELS: AIModelSpec[] = [
  { id: 'gpt-4o',       label: 'GPT-4o',         provider: 'OpenAI',  contextWindow: 128_000, costPer1kInput: 0.005,    costPer1kOutput: 0.015 },
  { id: 'gpt-4o-mini',  label: 'GPT-4o Mini',    provider: 'OpenAI',  contextWindow: 128_000, costPer1kInput: 0.000_15, costPer1kOutput: 0.000_60, recommended: true },
  { id: 'gpt-3.5-turbo',label: 'GPT-3.5 Turbo',  provider: 'OpenAI',  contextWindow: 16_000,  costPer1kInput: 0.000_50, costPer1kOutput: 0.001_50 },
];

export const DEFAULT_AI_CONFIG: GlobalAIConfig = {
  globalModel: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 800,
  systemPrompt: 'אתה עוזר AI לקליניקה רפואית. ענה בעברית בצורה ידידותית, קצרה ומקצועית. סייע בתיאום תורים, מענה על שאלות בנושא שירותי הקליניקה ומחיריהם. אל תספק מידע רפואי.',
  safetyFilter: true,
  streamingEnabled: true,
};

export function getMockPromptHistory(): PromptHistoryEntry[] {
  return [
    { id: '1', tenantName: 'קליניקת ד"ר לוי', model: 'gpt-4o-mini', userMessage: 'שלום, אני רוצה לקבוע תור לניקוי שיניים', assistantResponse: 'שלום! ברצון לעזור. מה הזמן הנוח לך השבוע? יש לנו מקומות פנויים ביום שני ורביעי.', inputTokens: 145, outputTokens: 38, costUsd: 0.000_04, timestamp: new Date(Date.now() - 60_000).toISOString(), durationMs: 812 },
    { id: '2', tenantName: 'מרפאת שלום',      model: 'gpt-4o-mini', userMessage: 'כמה עולה עקירת שן?', assistantResponse: 'המחיר תלוי בסוג העקירה. עקירה רגילה עולה 350-500 ₪. האם תרצה לקבוע ייעוץ?', inputTokens: 128, outputTokens: 42, costUsd: 0.000_03, timestamp: new Date(Date.now() - 180_000).toISOString(), durationMs: 694 },
    { id: '3', tenantName: 'קליניקת חיוך',    model: 'gpt-4o-mini', userMessage: 'האם יש תור פנוי ביום שישי?', assistantResponse: 'ביום שישי אנחנו פועלים עד 14:00. יש לנו מקום פנוי ב-10:30. אשאיל עבורך?', inputTokens: 134, outputTokens: 45, costUsd: 0.000_04, timestamp: new Date(Date.now() - 320_000).toISOString(), durationMs: 755 },
    { id: '4', tenantName: 'מרפאת השיניים',   model: 'gpt-4o',      userMessage: 'מה ההבדל בין ציפוי לבין השתלה?', assistantResponse: 'ציפוי הוא שיכוי דק המוצמד לחזית השן לשיפור אסתטי. השתלה מחליפה שן שנעדרת לגמרי. הטיפול המתאים תלוי במצב שלך.', inputTokens: 212, outputTokens: 78, costUsd: 0.002_27, timestamp: new Date(Date.now() - 600_000).toISOString(), durationMs: 1240 },
  ];
}
