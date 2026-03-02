import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Svg,
  G,
  Polygon,
  Line,
  Circle,
} from "@react-pdf/renderer";
import type { ResultadoCompletoDTO } from "@/src/application/use-cases/CalcularResultadoCompleto";
import type { Paciente } from "@/src/domain";
import type { ComparacaoResultado, FaseIndicadaLabel } from "@/src/domain";
import {
  CLASSIFICACAO_CLINICA_LABELS,
  CLASSIFICACAO_ESTRUTURA_LABELS,
  VARIACAO_LABELS,
  NOME_PROGRAMA_AVALIACAO,
  DESCRICAO_FASES_PROGRAMA,
  SCORE_CLINICO_MAX,
  PILARES_FULL_MARK,
} from "@/src/domain/constants";
import { calcularFase } from "@/src/domain/calculos";
import { formatarDataExibicao } from "@/lib/formatacao";

/** Rotulação da fase indicada para exibição integral no relatório (matriz oficial). */
const FASE_INDICADA_LABEL: Record<FaseIndicadaLabel, string> = {
  Integral: "Integral (forma integral)",
  Núcleo: "Núcleo (forma núcleo)",
  Essência: "Essência (forma essência)",
};

const COLORS = {
  text: "#1f2937",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  backgroundCard: "#fafafa",
  backgroundHeader: "#f8fafc",
  accent: "#2563eb",
  alertBg: "#fef2f2",
  alertBorder: "#fecaca",
  alertText: "#b91c1c",
  tableHeaderBg: "#f1f5f9",
  tableZebra: "#f9fafb",
  radarGrid: "#e5e7eb",
  radarAxis: "#d1d5db",
  radarFill: "#3b82f6",
} as const;

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

const RADAR_CONFIG = {
  size: 300,
  r: 72,
  labelOffset: 24,
  labelFontSize: 8,
  gridScales: [0.25, 0.5, 0.75, 1] as const,
} as const;

type RadarDataItem = { value: number; fullMark: number; subject: string };

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: COLORS.text,
  },
  header: {
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    marginBottom: SPACING.xs,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
    lineHeight: 1.4,
  },
  programLine: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 11,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 6,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardRow: {
    flexDirection: "row",
    marginBottom: SPACING.sm,
  },
  cardItem: {
    flex: 1,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 6,
    padding: SPACING.md,
    marginHorizontal: 4,
  },
  cardItemFirst: {
    marginLeft: 0,
  },
  cardItemLast: {
    marginRight: 0,
  },
  sectionTitleInCard: {
    marginTop: 0,
  },
  sectionTitleFirst: {
    marginTop: 0,
  },
  cardItemLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardItemValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
  },
  cardItemValueAccent: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
  },
  row: {
    flexDirection: "row",
    marginBottom: SPACING.xs,
  },
  label: {
    width: "38%",
    fontSize: 10,
    color: COLORS.textMuted,
  },
  value: {
    width: "62%",
    fontSize: 11,
    color: COLORS.text,
  },
  table: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.backgroundCard,
  },
  tableRowZebra: {
    backgroundColor: COLORS.tableZebra,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.tableHeaderBg,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.border,
  },
  tableCell: {
    padding: SPACING.sm,
    paddingVertical: 10,
    width: "50%",
    fontSize: 10,
  },
  tableHeaderCell: {
    padding: SPACING.sm,
    paddingVertical: 10,
    width: "50%",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: COLORS.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  alert: {
    backgroundColor: COLORS.alertBg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.alertBorder,
  },
  alertText: {
    color: COLORS.alertText,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textAlign: "center",
  },
  impressaoBox: {
    marginTop: SPACING.sm,
    padding: SPACING.lg,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  impressaoText: {
    fontSize: 11,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    color: COLORS.text,
  },
  fallbackMessage: {
    marginTop: SPACING.xl,
    color: COLORS.textMuted,
    fontSize: 12,
  },
  radarWrapper: {
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 6,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    alignItems: "center",
  },
  radarContainer: {
    alignItems: "center",
  },
  radarSvg: {
    width: RADAR_CONFIG.size,
    height: RADAR_CONFIG.size,
  },
});

export interface AvaliacaoPDFDocumentProps {
  resultado: ResultadoCompletoDTO;
  paciente: Paciente;
}

function formatRadarValue(value: number | string): string {
  return typeof value === "number" ? value.toFixed(2) : String(value);
}

/** Formata delta para exibição (ex: "+2" ou "-1.50"). */
function formatDelta(value: number, decimals = 0): string {
  const prefix = value > 0 ? "+" : "";
  const str = decimals ? value.toFixed(decimals) : String(value);
  return prefix + str;
}

/** Ângulo em graus do eixo i (0 no topo, sentido horário). */
function getAxisAngleDeg(i: number, n: number): number {
  return -90 + i * (360 / n);
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Gera os pontos do polígono do radar (eixo no topo, sentido horário). */
function radarPolygonPoints(data: RadarDataItem[]): string {
  const n = data.length;
  if (n === 0) return "";
  const cx = RADAR_CONFIG.size / 2;
  const cy = RADAR_CONFIG.size / 2;
  const points = data.map((item, i) => {
    const angleRad = degToRad(getAxisAngleDeg(i, n));
    const r = ((item.value ?? 0) / (item.fullMark || 4)) * RADAR_CONFIG.r;
    const x = cx + r * Math.cos(angleRad);
    const y = cy + r * Math.sin(angleRad);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return points.join(" ");
}

function RadarChartPDF({
  radar_combinado,
}: {
  radar_combinado: ResultadoCompletoDTO["radar_combinado"];
}) {
  const points = radarPolygonPoints(radar_combinado);
  const n = radar_combinado.length;
  const cx = RADAR_CONFIG.size / 2;
  const cy = RADAR_CONFIG.size / 2;
  const { r, labelOffset, labelFontSize } = RADAR_CONFIG;

  return (
    <View style={styles.radarWrapper}>
      <View style={styles.radarContainer}>
        <Svg
          viewBox={`0 0 ${RADAR_CONFIG.size} ${RADAR_CONFIG.size}`}
          style={styles.radarSvg}
        >
          <G>
            {RADAR_CONFIG.gridScales.map((scale) => (
              <Circle
                key={scale}
                cx={cx}
                cy={cy}
                r={r * scale}
                stroke={COLORS.radarGrid}
                strokeWidth={0.5}
                fill="none"
              />
            ))}
            {Array.from({ length: n }, (_, i) => {
              const angleRad = degToRad(getAxisAngleDeg(i, n));
              return (
                <Line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={cx + r * Math.cos(angleRad)}
                  y2={cy + r * Math.sin(angleRad)}
                  stroke={COLORS.radarAxis}
                  strokeWidth={0.5}
                />
              );
            })}
            {points ? (
              <Polygon
                points={points}
                fill={COLORS.radarFill}
                fillOpacity={0.25}
                stroke={COLORS.radarFill}
                strokeWidth={1}
              />
            ) : null}
            {radar_combinado.map((item, i) => {
              const angleRad = degToRad(getAxisAngleDeg(i, n));
              const labelR = r + labelOffset;
              return (
                <Text
                  key={item.subject}
                  x={cx + labelR * Math.cos(angleRad)}
                  y={cy + labelR * Math.sin(angleRad)}
                  style={{
                    fontSize: labelFontSize,
                    fill: COLORS.text,
                    textAnchor: "middle",
                    fontFamily: "Helvetica",
                  }}
                >
                  {item.subject}
                </Text>
              );
            })}
          </G>
        </Svg>
      </View>
    </View>
  );
}

function ComparacaoSection({ comp }: { comp: ComparacaoResultado }) {
  return (
    <>
      <Text style={[styles.sectionTitle, styles.sectionTitleInCard]}>
        Comparação com última consulta
      </Text>
      <View style={styles.row}>
        <Text style={styles.label}>Clínico</Text>
        <Text style={styles.value}>
          {VARIACAO_LABELS[comp.variacao_clinica]} (
          {formatDelta(comp.delta_clinico)})
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Estrutura</Text>
        <Text style={styles.value}>
          {VARIACAO_LABELS[comp.variacao_estrutura]} (
          {formatDelta(comp.delta_estrutura, 2)})
        </Text>
      </View>
      {comp.pilar_maior_melhora && (
        <View style={styles.row}>
          <Text style={styles.label}>Maior melhora</Text>
          <Text style={styles.value}>
            {comp.pilar_maior_melhora.label} (
            {formatDelta(comp.pilar_maior_melhora.delta)})
          </Text>
        </View>
      )}
      {comp.pilar_maior_piora && (
        <View style={styles.row}>
          <Text style={styles.label}>Maior piora</Text>
          <Text style={styles.value}>
            {comp.pilar_maior_piora.label} ({formatDelta(comp.pilar_maior_piora.delta)})
          </Text>
        </View>
      )}
    </>
  );
}

function RadarSection({
  radar_combinado,
}: {
  radar_combinado: ResultadoCompletoDTO["radar_combinado"];
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>Estrutura dos 9 pilares (radar)</Text>
      <RadarChartPDF radar_combinado={radar_combinado} />
    </>
  );
}

function getTableRowStyle(
  index: number
): typeof styles.tableRow | (typeof styles.tableRow | typeof styles.tableRowZebra)[] {
  return index % 2 === 1
    ? [styles.tableRow, styles.tableRowZebra]
    : styles.tableRow;
}

function TabelaPilaresPDF({
  radar_combinado,
}: {
  radar_combinado: ResultadoCompletoDTO["radar_combinado"];
}) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={styles.tableHeaderCell}>Dimensão</Text>
        <Text style={styles.tableHeaderCell}>Valor</Text>
      </View>
      {radar_combinado.map((item, index) => (
        <View key={item.subject} style={getTableRowStyle(index)}>
          <Text style={styles.tableCell}>{item.subject}</Text>
          <Text style={styles.tableCell}>
            {formatRadarValue(item.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Documento PDF da avaliação finalizada.
 * Espera resultado com consulta.clinico e consulta.estrutura preenchidos (garantido pela API que chama).
 */
export function AvaliacaoPDFDocument({
  resultado,
  paciente,
}: AvaliacaoPDFDocumentProps) {
  const { consulta, radar_combinado } = resultado;
  const clinico = consulta.clinico;
  const estrutura = consulta.estrutura;

  if (!clinico || !estrutura) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.fallbackMessage}>
            Dados incompletos para geração do PDF.
          </Text>
        </Page>
      </Document>
    );
  }

  const dataFormatada = formatarDataExibicao(consulta.date);

  const faseIndicada =
    consulta.fase_indicada ??
    calcularFase(
      clinico.score_total,
      estrutura.media,
      clinico.itens.C14 ?? 0
    );
  const faseIndicadaTexto =
    (FASE_INDICADA_LABEL[faseIndicada] ?? String(faseIndicada)) || "—";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Relatório de Avaliação</Text>
          <Text style={styles.subtitle}>
            {paciente.nome} · Prontuário: {paciente.identificador} ·{" "}
            {dataFormatada}
          </Text>
          <Text style={styles.programLine}>
            Programa: {NOME_PROGRAMA_AVALIACAO} ({DESCRICAO_FASES_PROGRAMA}).
          </Text>
        </View>

        {clinico.alerta_ideacao && (
          <View style={styles.alert}>
            <Text style={styles.alertText}>
              ALERTA DE IDEAÇÃO – PRIORIDADE MÁXIMA
            </Text>
          </View>
        )}

        <View style={styles.cardRow}>
          <View style={[styles.cardItem, styles.cardItemFirst]}>
            <Text style={styles.cardItemLabel}>Score clínico</Text>
            <Text style={styles.cardItemValue}>{clinico.score_total} de {SCORE_CLINICO_MAX}</Text>
            <Text style={[styles.label, { marginTop: 4 }]}>
              {CLASSIFICACAO_CLINICA_LABELS[clinico.classificacao]}
            </Text>
          </View>
          <View style={styles.cardItem}>
            <Text style={styles.cardItemLabel}>Média estrutural</Text>
            <Text style={styles.cardItemValue}>
              {estrutura.media.toFixed(2)} de {PILARES_FULL_MARK}
            </Text>
            <Text style={[styles.label, { marginTop: 4 }]}>
              {CLASSIFICACAO_ESTRUTURA_LABELS[estrutura.classificacao]}
            </Text>
          </View>
          <View style={[styles.cardItem, styles.cardItemLast]}>
            <Text style={styles.cardItemLabel}>Fase indicada</Text>
            <Text style={styles.cardItemValueAccent}>{faseIndicadaTexto}</Text>
          </View>
        </View>

        {consulta.comparacao && (
          <View style={styles.card}>
            <ComparacaoSection comp={consulta.comparacao} />
          </View>
        )}

        <RadarSection radar_combinado={radar_combinado} />
      </Page>

      <Page size="A4" style={styles.page}>
        <View wrap={false}>
          <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>
            Tabela – Estrutura dos 9 pilares (radar)
          </Text>
          <TabelaPilaresPDF radar_combinado={radar_combinado} />
        </View>

        <Text style={styles.sectionTitle}>Impressão clínica</Text>
        <View style={styles.impressaoBox}>
          <Text style={styles.impressaoText}>
            {consulta.impressao_clinica ?? ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
