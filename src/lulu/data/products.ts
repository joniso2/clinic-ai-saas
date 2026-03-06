export interface Product {
  id:     number;
  emoji:  string;
  name:   string;
  price:  number;
  tag:    string;
  accent: string;
}

export const PRODUCTS: Product[] = [
  { id: 1, emoji: "💅", name: "שמן טיפולי לציפורן",  price: 59,  tag: "הנמכר ביותר",  accent: "#fdf4f7" },
  { id: 2, emoji: "🧴", name: "סרום תיקון קוטיקולה", price: 79,  tag: "חדש",           accent: "#f2faf6" },
  { id: 3, emoji: "✨", name: "טופ קוט ג'ל",         price: 89,  tag: "פורמולה Pro",   accent: "#fdf8f0" },
  { id: 4, emoji: "💪", name: "מחזק ציפורניים",       price: 69,  tag: "פופולרי",       accent: "#f2f4fc" },
  { id: 5, emoji: "🌸", name: "קרם ידיים ורדים",     price: 95,  tag: "מהדורה מוגבלת", accent: "#fdf2f6" },
  { id: 6, emoji: "💡", name: "מנורת UV מיני",        price: 245, tag: "חובה",          accent: "#f5f2fe" },
];
