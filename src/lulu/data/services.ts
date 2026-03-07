export interface Service {
  id:         number;
  serviceId?: string; // UUID from DB (absent on static services)
  emoji:      string;
  name:       string;
  price:      number;
  dur:        string;
  desc:       string;
}

export const SERVICES: Service[] = [
  { id: 1, emoji: "💅", name: "מניקור ג'ל",        price: 150, dur: "45 דק׳",  desc: "ג'ל עמיד עם גימור מבריק ומוקפד." },
  { id: 2, emoji: "🦶", name: "פדיקור קלאסי",       price: 120, dur: "50 דק׳",  desc: "טיפול רגליים מפנק עם לק מסוג בחירה." },
  { id: 3, emoji: "🎨", name: "עיצוב ציפורניים",     price: 220, dur: "75 דק׳",  desc: "אמנות יד על כל ציפורן — כל עיצוב ייחודי." },
  { id: 4, emoji: "✨", name: "הארכת ג'ל בילדר",     price: 280, dur: "90 דק׳",  desc: "אורך וחוזק עם מראה אלגנטי ומושלם." },
  { id: 5, emoji: "🔮", name: "אפקט כרום",           price: 180, dur: "60 דק׳",  desc: "גימור מטאלי כמו מראה — בלתי נשכח." },
  { id: 6, emoji: "💎", name: "מניקור + פדיקור",     price: 320, dur: "110 דק׳", desc: "חבילת יד ורגל — חוויית יופי שלמה." },
];
