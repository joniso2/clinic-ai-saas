import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { BillingDocumentWithItems } from '@/types/billing';
import { DOC_TYPE_LABELS } from '@/types/billing';

// Register Heebo — supports Hebrew glyphs, available via Google Fonts CDN
Font.register({
  family: 'Heebo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/heebo/v26/NGSpv5_NC0k9P_v6ZUCbLRAHxK1EiSysd0mm_00.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/heebo/v26/NGSpv5_NC0k9P_v6ZUCbLRAHxK1EiS6Sd0mm_00.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/heebo/v26/NGSpv5_NC0k9P_v6ZUCbLRAHxK1EiSuQd0mm_00.woff2', fontWeight: 700 },
  ],
});

// Disable hyphenation for Hebrew
Font.registerHyphenationCallback((word) => [word]);

const COLOR = {
  ink:    '#0f172a',
  muted:  '#64748b',
  subtle: '#94a3b8',
  line:   '#e2e8f0',
  bg:     '#f8fafc',
  bgDark: '#f1f5f9',
  green:  '#16a34a',
  red:    '#dc2626',
  white:  '#ffffff',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Heebo',
    fontSize: 10,
    color: COLOR.ink,
    backgroundColor: COLOR.white,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    direction: 'rtl',
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingBottom: 20,
    borderBottom: `1.5 solid ${COLOR.line}`,
  },
  headerLeft: { alignItems: 'flex-end', textAlign: 'right' },
  headerRight: { alignItems: 'flex-start', textAlign: 'left', maxWidth: 200 },
  docType: { fontSize: 9, color: COLOR.muted, textAlign: 'right', marginBottom: 3 },
  docNumber: { fontSize: 22, fontWeight: 700, color: COLOR.ink, textAlign: 'right' },
  statusBadge: {
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  statusText: { fontSize: 8, fontWeight: 600 },
  businessName: { fontSize: 14, fontWeight: 700, textAlign: 'left', marginBottom: 3 },
  businessDetail: { fontSize: 8.5, color: COLOR.muted, textAlign: 'left', marginBottom: 1.5 },

  // ── Metadata row (issued date / payment method) ──────────────────────────
  metaRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 20,
  },
  metaCard: {
    flex: 1,
    backgroundColor: COLOR.bg,
    borderRadius: 6,
    padding: 10,
  },
  metaLabel: { fontSize: 7.5, color: COLOR.subtle, marginBottom: 3, textAlign: 'right' },
  metaValue: { fontSize: 9.5, fontWeight: 600, color: COLOR.ink, textAlign: 'right' },

  // ── Info grid (business + customer side by side) ─────────────────────────
  infoGrid: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 20,
  },
  infoBox: {
    flex: 1,
    backgroundColor: COLOR.bg,
    borderRadius: 6,
    padding: 10,
  },
  infoBoxTitle: {
    fontSize: 7.5,
    fontWeight: 700,
    color: COLOR.subtle,
    textTransform: 'uppercase',
    textAlign: 'right',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  infoName: { fontSize: 10, fontWeight: 600, color: COLOR.ink, textAlign: 'right', marginBottom: 2 },
  infoDetail: { fontSize: 8.5, color: COLOR.muted, textAlign: 'right', marginBottom: 1.5 },

  // ── Items table ──────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: COLOR.bgDark,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row-reverse',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottom: `0.5 solid ${COLOR.line}`,
  },
  colDesc:  { flex: 1, textAlign: 'right' },
  colQty:   { width: 36, textAlign: 'center' },
  colPrice: { width: 60, textAlign: 'left' },
  colTotal: { width: 64, textAlign: 'left' },
  thText: { fontSize: 8, fontWeight: 700, color: COLOR.muted },
  tdText: { fontSize: 9, color: COLOR.ink },
  tdMuted: { fontSize: 9, color: COLOR.muted },

  // ── Totals ───────────────────────────────────────────────────────────────
  totalsContainer: {
    alignItems: 'flex-start',
    marginTop: 10,
    marginBottom: 28,
  },
  totalsBox: {
    width: 220,
    backgroundColor: COLOR.bg,
    borderRadius: 6,
    padding: 12,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: { fontSize: 9, color: COLOR.muted, textAlign: 'right' },
  totalValue: { fontSize: 9, color: COLOR.ink, textAlign: 'left' },
  totalDivider: { borderTop: `1 solid ${COLOR.line}`, marginVertical: 6 },
  grandLabel: { fontSize: 10.5, fontWeight: 700, color: COLOR.ink, textAlign: 'right' },
  grandValue: { fontSize: 10.5, fontWeight: 700, color: COLOR.ink, textAlign: 'left' },

  // ── Cancellation notice ──────────────────────────────────────────────────
  cancelBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
    border: `1 solid #fecaca`,
  },
  cancelText: { fontSize: 9, color: COLOR.red, textAlign: 'right' },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    borderTop: `1 solid ${COLOR.line}`,
    paddingTop: 8,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7.5, color: COLOR.subtle },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₪${Number(n).toLocaleString('he-IL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  doc: BillingDocumentWithItems;
  paymentMethod?: string | null;
}

export function BillingDocumentPDF({ doc, paymentMethod }: Props) {
  const vatPct = Math.round(Number(doc.vat_rate) * 100);
  const isIssued = doc.status === 'issued';

  return (
    <Document
      title={doc.doc_number}
      author={doc.business_name}
      language="he"
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          {/* Right side: doc info */}
          <View style={s.headerLeft}>
            <Text style={s.docType}>{DOC_TYPE_LABELS[doc.doc_type]}</Text>
            <Text style={s.docNumber}>{doc.doc_number}</Text>
            <View
              style={[
                s.statusBadge,
                { backgroundColor: isIssued ? '#dcfce7' : '#fee2e2' },
              ]}
            >
              <Text style={[s.statusText, { color: isIssued ? COLOR.green : COLOR.red }]}>
                {isIssued ? 'הופק' : 'בוטל'}
              </Text>
            </View>
          </View>

          {/* Left side: business info */}
          <View style={s.headerRight}>
            <Text style={s.businessName}>{doc.business_name}</Text>
            <Text style={s.businessDetail}>מס׳ עסק: {doc.business_number}</Text>
            {doc.vat_number && (
              <Text style={s.businessDetail}>עוסק מורשה: {doc.vat_number}</Text>
            )}
            {doc.business_address && (
              <Text style={s.businessDetail}>{doc.business_address}</Text>
            )}
          </View>
        </View>

        {/* ── Metadata row ───────────────────────────────────────────────── */}
        <View style={s.metaRow}>
          <View style={s.metaCard}>
            <Text style={s.metaLabel}>תאריך הנפקה</Text>
            <Text style={s.metaValue}>{fmtDate(doc.issued_at)}</Text>
          </View>
          {paymentMethod && (
            <View style={s.metaCard}>
              <Text style={s.metaLabel}>אמצעי תשלום</Text>
              <Text style={s.metaValue}>{paymentMethod}</Text>
            </View>
          )}
          <View style={s.metaCard}>
            <Text style={s.metaLabel}>מטבע</Text>
            <Text style={s.metaValue}>{doc.currency}</Text>
          </View>
        </View>

        {/* ── Cancellation notice ────────────────────────────────────────── */}
        {doc.status === 'cancelled' && (
          <View style={s.cancelBox}>
            <Text style={s.cancelText}>
              מסמך זה בוטל{doc.cancelled_at ? ` — ${fmtDate(doc.cancelled_at)}` : ''}
            </Text>
          </View>
        )}

        {/* ── Customer / Business info grid ──────────────────────────────── */}
        <View style={s.infoGrid}>
          <View style={s.infoBox}>
            <Text style={s.infoBoxTitle}>פרטי לקוח</Text>
            <Text style={s.infoName}>{doc.customer_name}</Text>
            {doc.customer_phone && (
              <Text style={s.infoDetail}>{doc.customer_phone}</Text>
            )}
            {doc.customer_email && (
              <Text style={s.infoDetail}>{doc.customer_email}</Text>
            )}
            {doc.customer_address && (
              <Text style={s.infoDetail}>{doc.customer_address}</Text>
            )}
            {doc.customer_type === 'business' && doc.customer_business_number && (
              <Text style={s.infoDetail}>ח.פ: {doc.customer_business_number}</Text>
            )}
          </View>
        </View>

        {/* ── Items table ────────────────────────────────────────────────── */}
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.colDesc]}>תיאור</Text>
          <Text style={[s.thText, s.colQty]}>כמות</Text>
          <Text style={[s.thText, s.colPrice]}>מחיר יחידה</Text>
          <Text style={[s.thText, s.colTotal]}>סה״כ</Text>
        </View>

        {doc.billing_document_items.map((item) => (
          <View key={item.id} style={s.tableRow}>
            <Text style={[s.tdText, s.colDesc]}>{item.description}</Text>
            <Text style={[s.tdMuted, s.colQty]}>{item.quantity}</Text>
            <Text style={[s.tdMuted, s.colPrice]}>{fmt(item.unit_price)}</Text>
            <Text style={[s.tdText, s.colTotal]}>{fmt(item.line_total)}</Text>
          </View>
        ))}

        {/* ── Totals ─────────────────────────────────────────────────────── */}
        <View style={s.totalsContainer}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>סכום לפני מע״מ</Text>
              <Text style={s.totalValue}>{fmt(doc.subtotal)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>מע״מ ({vatPct}%)</Text>
              <Text style={s.totalValue}>{fmt(doc.vat_amount)}</Text>
            </View>
            <View style={s.totalDivider} />
            <View style={s.totalRow}>
              <Text style={s.grandLabel}>סה״כ לתשלום</Text>
              <Text style={s.grandValue}>{fmt(doc.total)}</Text>
            </View>
          </View>
        </View>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{doc.doc_number} · {DOC_TYPE_LABELS[doc.doc_type]}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
            `עמוד ${pageNumber} מתוך ${totalPages}`
          } />
        </View>

      </Page>
    </Document>
  );
}
