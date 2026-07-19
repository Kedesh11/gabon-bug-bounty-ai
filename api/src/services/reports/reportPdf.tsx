import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

// Structured export generated from Report data (Phase 3 fields), not the hacker's
// own uploaded write-up (see reportStorage.ts) — this is the platform's normalized,
// pentest-report-style rendering of whatever the hacker filled into the form.
export interface ReportPdfData {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  createdAt: Date;
  hackerName: string;
  programmeName: string;
  vulnerabilityCategoryName: string | null;
  cweId: string | null;
  cvssScore: number | null;
  cvssVector: string | null;
  affectedAsset: string | null;
  stepsToReproduce: string | null;
  impact: string | null;
  remediation: string | null;
  proof: string;
  isDuplicate: boolean;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  coverTitle: { fontSize: 24, fontWeight: 700, marginBottom: 12 },
  coverSubtitle: { fontSize: 12, color: "#555", marginBottom: 4 },
  coverMetaBlock: { marginTop: 40, borderTop: "1 solid #ddd", paddingTop: 16 },
  coverMetaRow: { flexDirection: "row", marginBottom: 6 },
  coverMetaLabel: { width: 140, fontWeight: 700, color: "#555" },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#111", borderBottom: "1 solid #ddd", paddingBottom: 4 },
  label: { fontWeight: 700, color: "#555", marginBottom: 2 },
  paragraph: { marginBottom: 8, lineHeight: 1.5 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 3, fontSize: 9, fontWeight: 700 },
  monospace: { fontFamily: "Courier", fontSize: 9, backgroundColor: "#f5f5f5", padding: 8, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, fontSize: 8, color: "#999", textAlign: "center" },
});

const SEVERITY_COLORS: Record<string, string> = {
  critique: "#dc2626",
  haute: "#ea580c",
  moyenne: "#ca8a04",
  faible: "#2563eb",
  info: "#6b7280",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function LabeledText({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.paragraph}>{value}</Text>
    </View>
  );
}

export function ReportPdfDocument({ report }: { report: ReportPdfData }) {
  const severityColor = SEVERITY_COLORS[report.severity] ?? "#6b7280";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.coverTitle}>Rapport de vulnérabilité</Text>
        <Text style={styles.coverSubtitle}>{report.title}</Text>

        <View style={styles.badgeRow}>
          <Text style={[styles.badge, { backgroundColor: severityColor, color: "#fff" }]}>
            {report.severity.toUpperCase()}
          </Text>
          {report.isDuplicate && (
            <Text style={[styles.badge, { backgroundColor: "#78350f", color: "#fff" }]}>DOUBLON POTENTIEL</Text>
          )}
        </View>

        <View style={styles.coverMetaBlock}>
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Programme</Text>
            <Text>{report.programmeName}</Text>
          </View>
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Chercheur</Text>
            <Text>{report.hackerName}</Text>
          </View>
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Catégorie (VRT)</Text>
            <Text>{report.vulnerabilityCategoryName ?? "Non classifiée"}</Text>
          </View>
          {report.cweId && (
            <View style={styles.coverMetaRow}>
              <Text style={styles.coverMetaLabel}>CWE</Text>
              <Text>{report.cweId}</Text>
            </View>
          )}
          {report.cvssScore != null && (
            <View style={styles.coverMetaRow}>
              <Text style={styles.coverMetaLabel}>Score CVSS</Text>
              <Text>{report.cvssScore.toFixed(1)} {report.cvssVector ? `(${report.cvssVector})` : ""}</Text>
            </View>
          )}
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Statut</Text>
            <Text>{report.status}</Text>
          </View>
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Date de soumission</Text>
            <Text>{report.createdAt.toLocaleDateString("fr-FR")}</Text>
          </View>
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Identifiant</Text>
            <Text>{report.id}</Text>
          </View>
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} fixed />
      </Page>

      <Page size="A4" style={styles.page}>
        <Section title="Résumé exécutif">
          <Text style={styles.paragraph}>{report.description}</Text>
        </Section>

        <Section title="Détail de la vulnérabilité">
          <LabeledText label="Actif affecté" value={report.affectedAsset} />
          <LabeledText label="Étapes de reproduction" value={report.stepsToReproduce} />
        </Section>

        <Section title="Impact">
          <LabeledText label="Impact estimé" value={report.impact} />
        </Section>

        <Section title="Preuve de concept / Évidence">
          <Text style={styles.monospace}>{report.proof}</Text>
        </Section>

        {report.remediation && (
          <Section title="Remédiation suggérée">
            <Text style={styles.paragraph}>{report.remediation}</Text>
          </Section>
        )}

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

export async function renderReportPdf(report: ReportPdfData): Promise<Buffer> {
  return renderToBuffer(<ReportPdfDocument report={report} />);
}
