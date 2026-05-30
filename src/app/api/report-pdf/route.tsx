import { Document, Page, StyleSheet, Text, View, renderToStream } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { InsightReport } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 38, fontSize: 10, color: "#171717", fontFamily: "Helvetica" },
  title: { fontSize: 24, marginBottom: 10 },
  subtitle: { color: "#666", marginBottom: 18 },
  section: { marginTop: 14 },
  heading: { fontSize: 13, marginBottom: 6 },
  item: { marginBottom: 4, lineHeight: 1.35 },
});

function ReportDocument({ report }: { report: InsightReport }) {
  const list = (items: string[]) => items.map((item) => <Text key={item} style={styles.item}>- {item}</Text>);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{report.productName}</Text>
        <Text style={styles.subtitle}>
          {report.reviewCount} reviews analyzed
          {report.requestedReviewCount ? " - best-effort retrieval" : ""} - {new Date(report.generatedAt).toLocaleDateString()}
        </Text>
        {report.requestedReviewCount && report.reviewCount < report.requestedReviewCount ? (
          <Text>
            SellerSignal uses every public review the data source allows us to retrieve during the run. Package names are insight levels, not guaranteed review counts.
          </Text>
        ) : null}
        <Text>{report.executiveSummary}</Text>
        <View style={styles.section}><Text style={styles.heading}>Top compliments</Text>{list(report.topCompliments)}</View>
        <View style={styles.section}><Text style={styles.heading}>Top complaints</Text>{list(report.topComplaints)}</View>
        <View style={styles.section}><Text style={styles.heading}>Common phrases</Text>{list(report.commonPhrases)}</View>
        <View style={styles.section}><Text style={styles.heading}>Suggested product improvements</Text>{list(report.productImprovements)}</View>
        <View style={styles.section}><Text style={styles.heading}>Positioning angles</Text>{list(report.positioningAngles)}</View>
        <View style={styles.section}><Text style={styles.heading}>Marketing copy ideas</Text>{list(report.marketingCopyIdeas)}</View>
      </Page>
    </Document>
  );
}

export async function POST(request: Request) {
  const { report } = (await request.json()) as { report: InsightReport };

  if (!report) {
    return NextResponse.json({ error: "Missing report." }, { status: 400 });
  }

  const stream = await renderToStream(<ReportDocument report={report} />);
  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report.id}.pdf"`,
    },
  });
}
