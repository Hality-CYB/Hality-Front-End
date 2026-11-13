import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { CONTATOS_HALITY } from "@/lib/contatos-hality";
import { AVISO_PRE_DIAGNOSTICO, type RelatorioDiagnostico } from "@/lib/relatorio-diagnostico";

const TEAL = "#0b6b82";
const TEAL_ESCURO = "#0a3d4a";
const CINZA = "#64748b";
const BORDA = "#e2e8f0";
const FUNDO = "#f1f5f9";

const s = StyleSheet.create({
  pagina: {
    paddingTop: 0,
    paddingBottom: 72,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#0f172a",
  },
  cabecalho: {
    backgroundColor: TEAL_ESCURO,
    paddingVertical: 22,
    paddingHorizontal: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  marca: { color: "#ffffff", fontSize: 16, fontFamily: "Helvetica-Bold" },
  marcaSub: { color: "#a5d8e3", fontSize: 9, marginTop: 3 },
  cabecalhoDireita: { alignItems: "flex-end" },
  numero: { color: "#ffffff", fontSize: 12, fontFamily: "Helvetica-Bold" },
  cabecalhoData: { color: "#cbe7ee", fontSize: 9, marginTop: 3 },
  corpo: { paddingHorizontal: 36, paddingTop: 20 },
  paciente: { fontSize: 10, color: CINZA, marginBottom: 14 },
  pacienteNome: { color: "#0f172a", fontFamily: "Helvetica-Bold" },
  alerta: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffc107",
    borderWidth: 1,
    borderRadius: 6,
    padding: 9,
    marginBottom: 14,
    color: "#92400e",
    fontSize: 9,
  },
  linhaResultado: { flexDirection: "row", gap: 14, marginBottom: 18 },
  foto: { width: 190, height: 142, borderRadius: 8, objectFit: "cover" },
  cartaoResultado: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDA,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 14,
    justifyContent: "center",
  },
  rotulo: { fontSize: 9, color: TEAL, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  nivel: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  detalhe: { fontSize: 9, color: CINZA },
  secao: { marginBottom: 16 },
  tituloSecao: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: TEAL,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDA,
  },
  texto: { fontSize: 10, lineHeight: 1.45 },
  textoCinza: { fontSize: 9, color: CINZA, marginBottom: 4 },
  tabela: { borderWidth: 1, borderColor: BORDA, borderRadius: 6 },
  linhaTabela: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: BORDA,
  },
  linhaTabelaPar: { backgroundColor: FUNDO },
  pergunta: { flex: 1, fontSize: 9, color: "#334155", paddingRight: 10 },
  resposta: { width: 120, fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right" },
  orientacao: { marginBottom: 9 },
  orientacaoTitulo: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  rodape: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: BORDA,
    paddingTop: 8,
  },
  rodapeAviso: { fontSize: 8, color: CINZA, marginBottom: 4 },
  rodapeLinha: { flexDirection: "row", justifyContent: "space-between" },
  rodapeContato: { fontSize: 8, color: TEAL },
  rodapePagina: { fontSize: 8, color: CINZA },
});

type Props = {
  relatorio: RelatorioDiagnostico;
  /** Foto já embutida como data URL; sem ela, o relatório sai sem a imagem. */
  foto: string | null;
};

/** Relatório do diagnóstico em PDF (A4), desenhado com @react-pdf/renderer. */
export function RelatorioDiagnosticoPdf({ relatorio: r, foto }: Props) {
  return (
    <Document
      title={`Diagnóstico #${r.numero} — Check Your Breath`}
      author="Check Your Breath · Hality"
      subject="Relatório de pré-diagnóstico de halitose"
      language="pt-BR"
    >
      <Page size="A4" style={s.pagina}>
        <View style={s.cabecalho} fixed>
          <View>
            <Text style={s.marca}>Check Your Breath</Text>
            <Text style={s.marcaSub}>Relatório de pré-diagnóstico · Hality</Text>
          </View>
          <View style={s.cabecalhoDireita}>
            <Text style={s.numero}>Diagnóstico #{r.numero}</Text>
            <Text style={s.cabecalhoData}>{r.data}</Text>
          </View>
        </View>

        <View style={s.corpo}>
          {r.pacienteNome && (
            <Text style={s.paciente}>
              Paciente: <Text style={s.pacienteNome}>{r.pacienteNome}</Text>
            </Text>
          )}

          {r.aguardandoRevisao && (
            <Text style={s.alerta}>
              Este resultado ainda não foi revisado por um profissional de saúde.
            </Text>
          )}

          <View style={s.linhaResultado} wrap={false}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf não tem alt */}
            {foto && <Image src={foto} style={s.foto} />}
            <View style={[s.cartaoResultado, { borderLeftColor: r.resultado.cor }]}>
              <Text style={s.rotulo}>{r.resultado.titulo.toUpperCase()}</Text>
              <Text style={[s.nivel, { color: r.resultado.cor }]}>{r.resultado.nivel}</Text>
              {r.resultado.detalhe && <Text style={s.detalhe}>{r.resultado.detalhe}</Text>}
            </View>
          </View>

          {r.revisao && (
            <View style={s.secao} wrap={false}>
              <Text style={s.tituloSecao}>Revisão</Text>
              <Text style={s.textoCinza}>
                Revisado por {r.revisao.autor}
                {r.revisao.data ? ` em ${r.revisao.data}` : ""}
              </Text>
              {r.revisao.observacoes && <Text style={s.texto}>{r.revisao.observacoes}</Text>}
            </View>
          )}

          {r.anamnese.length > 0 && (
            <View style={s.secao}>
              <Text style={s.tituloSecao}>Anamnese</Text>
              <View style={s.tabela}>
                {r.anamnese.map((item, i) => (
                  <View
                    key={item.pergunta}
                    style={i % 2 === 1 ? [s.linhaTabela, s.linhaTabelaPar] : s.linhaTabela}
                    wrap={false}
                  >
                    <Text style={s.pergunta}>{item.pergunta}</Text>
                    <Text style={s.resposta}>{item.resposta}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {r.orientacoes.length > 0 && (
            <View style={s.secao}>
              <Text style={s.tituloSecao}>Orientações</Text>
              {r.orientacoes.map((o) => (
                <View key={o.titulo} style={s.orientacao} wrap={false}>
                  <Text style={s.orientacaoTitulo}>{o.titulo}</Text>
                  {o.textos.map((t, i) => (
                    <Text key={i} style={s.texto}>
                      {t}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={s.rodape} fixed>
          <Text style={s.rodapeAviso}>{AVISO_PRE_DIAGNOSTICO}</Text>
          <View style={s.rodapeLinha}>
            <Text style={s.rodapeContato}>
              Hality · WhatsApp {CONTATOS_HALITY.whatsapp.exibicao} · {CONTATOS_HALITY.email} ·{" "}
              {CONTATOS_HALITY.site.exibicao}
            </Text>
            <Text
              style={s.rodapePagina}
              render={({ pageNumber, totalPages }) =>
                `Gerado em ${r.geradoEm} · ${pageNumber}/${totalPages}`
              }
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}
