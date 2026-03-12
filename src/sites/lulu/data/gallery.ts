export interface GalleryItem {
  id:    number;
  rows:  number;
  bg:    string;
  label: string;
}

export const GALLERY: GalleryItem[] = [
  { id: 1, rows: 2, bg: "linear-gradient(160deg,#f5dde8 0%,#e8b4c8 100%)", label: "כרום ורוד" },
  { id: 2, rows: 1, bg: "linear-gradient(160deg,#d8ede6 0%,#b4d4ca 100%)", label: "מינט גלייז" },
  { id: 3, rows: 1, bg: "linear-gradient(160deg,#f5e8cc 0%,#e0c890 100%)", label: "אבק זהב" },
  { id: 4, rows: 1, bg: "linear-gradient(160deg,#f5d8d8 0%,#e0a0a0 100%)", label: "קטיפה אדומה" },
  { id: 5, rows: 2, bg: "linear-gradient(160deg,#e0e0f0 0%,#c0c0e0 100%)", label: "שמיים לילה" },
  { id: 6, rows: 1, bg: "linear-gradient(160deg,#ecddf5 0%,#d4a8e8 100%)", label: "ערפל סגול" },
];
