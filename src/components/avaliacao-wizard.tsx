"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ScanLine,
  Camera,
  Sun,
  Sparkles,
  Ban,
  Droplet,
  CircleCheck,
  ClipboardList,
  ChevronLeft,
  Check,
  ImageUp,
  Phone,
  Mail,
  Stethoscope,
  TriangleAlert,
  ChartColumn,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StepBar } from "@/components/step-bar";
import { ScanLoader } from "@/components/scan-loader";
import { LevelChip } from "@/components/level-chip";
import { TipCard } from "@/components/tip-card";
import { nivelColor, nivelLabel } from "@/lib/level-format";
import { useAnamnesePerguntas, useCriarAnamnese } from "@/hooks/use-anamnese";
import { useCriarDiagnostico } from "@/hooks/use-diagnosticos";
import { useDicas } from "@/hooks/use-dicas";
import { cn } from "@/lib/utils";
import type { DiagnosticoNivel } from "@/types/diagnostico";

/**
 * Fluxo de avaliação — 9 passos internos, uma rota só (como em Design/'s
 * DiagnosisFlow), com o estado do wizard em memória. Sem persistência em
 * sessionStorage ainda (o plano original previa rota por passo +
 * sessionStorage — simplificado aqui pra cobrir a tela toda primeiro; dá
 * pra evoluir depois sem mudar a UI).
 *
 * Compartilhado entre paciente (autoavaliação) e profissional (avalia um
 * paciente selecionado) — só o `pacienteId`/`voltarHref` mudam.
 */

const VISUAL_STEPS = ["Anamnese", "Captura", "Pré-diagnóstico"];
const toVisual = (step: number) => (step === 0 ? -1 : step <= 2 ? 0 : step <= 5 ? 1 : 2);

const PREPARO = [
  {
    title: "Responder perguntas",
    sub: "Anamnese rápida sobre sua saúde bucal",
    Icon: ClipboardList,
  },
  { title: "Preparar a câmera", sub: "Orientações para captura de qualidade", Icon: Sun },
  { title: "Fotografar a língua", sub: "Captura guiada com enquadramento", Icon: Camera },
  { title: "Aguardar análise da IA", sub: "Processamento automático da imagem", Icon: Sparkles },
  {
    title: "Visualizar pré-diagnóstico",
    sub: "Classificação e orientações personalizadas",
    Icon: ChartColumn,
  },
];

const ORIENTACOES_CAPTURA = [
  { Icon: Sun, title: "Manhã e jejum", desc: "Faça o exame pela manhã" },
  { Icon: Sparkles, title: "Boa iluminação", desc: "Ambiente bem iluminado" },
  { Icon: ScanLine, title: "Flash ativo", desc: "Ligue o flash do celular" },
  { Icon: Ban, title: "Sem enxaguante", desc: "Não use antes do exame" },
  { Icon: Droplet, title: "Hidratado(a)", desc: "Beba água antes" },
  { Icon: CircleCheck, title: "Língua relaxada", desc: "Completamente estendida" },
];

type AvaliacaoWizardProps = {
  pacienteId: string;
  voltarHref: string;
};

export function AvaliacaoWizard({ pacienteId, voltarHref }: AvaliacaoWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [aIdx, setAIdx] = useState(0);
  const [resultado, setResultado] = useState<{
    nivel: DiagnosticoNivel;
    confiancaIA?: number;
  } | null>(null);

  const perguntas = useAnamnesePerguntas();
  const criarAnamnese = useCriarAnamnese();
  const criarDiagnostico = useCriarDiagnostico();
  const dicasDoResultado = useDicas({ publicado: true });

  const next = () => setStep((s) => s + 1);
  const back = () => (step > 0 ? setStep((s) => s - 1) : router.push(voltarHref));

  const questoes = perguntas.data ?? [];
  const questaoAtual = questoes[aIdx];

  function responder(valor: string) {
    if (!questaoAtual) return;
    setAnswers((a) => ({ ...a, [questaoAtual.id]: valor }));
  }

  function nextAns() {
    if (aIdx < questoes.length - 1) setAIdx((a) => a + 1);
    else next();
  }

  async function confirmarAnamneseECaptura() {
    const respostas = questoes.map((q) => ({ perguntaId: q.id, valor: answers[q.id] ?? "" }));
    const anamnese = await criarAnamnese.mutateAsync(respostas);
    const diagnostico = await criarDiagnostico.mutateAsync({
      pacienteId,
      imagemUrl: "",
      anamneseId: anamnese.id,
    });
    setResultado({ nivel: diagnostico.nivel ?? 1, confiancaIA: diagnostico.confiancaIA });
    setStep(6);
  }

  const dicasFiltradas = (dicasDoResultado.data ?? []).filter(
    (d) => resultado && d.niveis.includes(resultado.nivel),
  );

  return (
    <div className="bg-background flex min-h-full flex-col">
      <div className="border-border shrink-0 border-b bg-white p-3.5">
        <StepBar steps={VISUAL_STEPS} current={toVisual(step)} />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* 0 — Intro */}
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <div className="pt-5 pb-2 text-center">
              <div className="bg-secondary text-primary mx-auto mb-4 flex h-18 w-18 items-center justify-center rounded-[22px]">
                <ScanLine className="h-9 w-9" />
              </div>
              <h2 className="mb-2 text-xl">Seu diagnóstico em etapas</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Leva aproximadamente 2 minutos. Siga as instruções para um resultado preciso.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {PREPARO.map(({ title, sub, Icon }) => (
                <Card
                  key={title}
                  className="flex-row items-center gap-3.5 rounded-lg p-3.5 shadow-sm ring-0"
                >
                  <div className="bg-secondary text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="font-heading text-sm font-bold">{title}</div>
                    <div className="text-muted-foreground text-xs">{sub}</div>
                  </div>
                </Card>
              ))}
            </div>
            <Button size="lg" onClick={next}>
              Começar diagnóstico
            </Button>
            <Button variant="ghost" onClick={back}>
              Cancelar
            </Button>
          </div>
        )}

        {/* 1 — Anamnese */}
        {step === 1 && questaoAtual && (
          <div className="flex flex-col gap-5">
            <div>
              <div className="mb-1.5 flex justify-between">
                <h2 className="text-lg">Anamnese</h2>
                <span className="text-muted-foreground text-xs">
                  {aIdx + 1} de {questoes.length}
                </span>
              </div>
              <div className="bg-border h-1 overflow-hidden rounded-4xl">
                <div
                  className="bg-primary h-full rounded-4xl transition-all duration-300"
                  style={{ width: `${((aIdx + 1) / questoes.length) * 100}%` }}
                />
              </div>
            </div>
            <Card className="rounded-lg p-5 shadow-sm ring-0">
              <p className="font-heading mb-5 text-lg leading-snug font-semibold">
                {questaoAtual.texto}
              </p>

              {questaoAtual.tipo === "sim_nao" && (
                <div className="grid grid-cols-2 gap-2.5">
                  {["Sim", "Não"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        responder(opt);
                        nextAns();
                      }}
                      className={cn(
                        "font-heading rounded-[14px] border-2 p-4 text-[15px] font-bold transition-colors",
                        answers[questaoAtual.id] === opt
                          ? "border-primary bg-secondary text-primary"
                          : "border-border bg-background text-foreground",
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {questaoAtual.tipo === "escolha" && (
                <div className="flex flex-col gap-2">
                  {questaoAtual.opcoes?.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        responder(opt);
                        nextAns();
                      }}
                      className={cn(
                        "font-heading rounded-xl border-2 p-3.5 text-left text-sm font-semibold transition-colors",
                        answers[questaoAtual.id] === opt
                          ? "border-primary bg-secondary text-primary"
                          : "border-border bg-background text-foreground",
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {questaoAtual.tipo === "texto" && (
                <div className="flex flex-col gap-3">
                  <Input
                    placeholder="Digite sua resposta..."
                    value={answers[questaoAtual.id] ?? ""}
                    onChange={(e) => responder(e.target.value)}
                  />
                  <Button onClick={nextAns}>Próximo</Button>
                </div>
              )}

              {questaoAtual.tipo === "escala" && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => responder(String(n))}
                        className={cn(
                          "font-heading flex h-13 w-13 items-center justify-center rounded-2xl border-2 text-xl font-extrabold transition-colors",
                          answers[questaoAtual.id] === String(n)
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-background text-foreground",
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="text-muted-foreground flex justify-between text-[11px]">
                    <span>Ruim</span>
                    <span>Excelente</span>
                  </div>
                  <Button onClick={nextAns} disabled={!answers[questaoAtual.id]}>
                    Próximo
                  </Button>
                </div>
              )}
            </Card>
            {aIdx > 0 && (
              <Button variant="ghost" onClick={() => setAIdx((a) => a - 1)}>
                <ChevronLeft className="h-4 w-4" /> Pergunta anterior
              </Button>
            )}
          </div>
        )}

        {/* 2 — Revisão da anamnese */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="pb-1 text-center">
              <div className="bg-secondary text-primary mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-[18px]">
                <ClipboardList className="h-7 w-7" />
              </div>
              <h2 className="mb-1.5 text-xl">Confirme suas respostas</h2>
              <p className="text-muted-foreground text-sm">
                Revise as informações antes de prosseguir para a captura
              </p>
            </div>
            <Card className="rounded-lg p-5 shadow-sm ring-0">
              <div className="font-heading text-primary mb-3.5 text-xs font-bold tracking-wide uppercase">
                Anamnese
              </div>
              <div className="flex flex-col">
                {questoes.map((q, i) => {
                  const ans = answers[q.id];
                  return (
                    <div
                      key={q.id}
                      className={cn(
                        "flex items-start gap-3 py-3",
                        i < questoes.length - 1 && "border-border border-b",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.25 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border-[1.5px]",
                          ans ? "border-primary bg-secondary" : "border-border bg-background",
                        )}
                      >
                        {ans ? (
                          <Check className="text-primary h-3.5 w-3.5" />
                        ) : (
                          <span className="font-heading text-gray-3 text-[11px] font-bold">
                            {i + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-muted-foreground mb-0.5 text-xs leading-snug">
                          {q.texto}
                        </div>
                        {ans ? (
                          <div className="font-heading text-sm font-bold">{ans}</div>
                        ) : (
                          <div className="font-heading text-destructive text-[13px] font-semibold">
                            Não respondida
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setAIdx(i);
                          setStep(1);
                        }}
                        className="font-heading text-primary shrink-0 rounded-lg px-2 py-1 text-xs font-semibold"
                      >
                        Editar
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
            {Object.keys(answers).length < questoes.length && (
              <div className="flex items-center gap-2 rounded-xl border border-[#FFC107] bg-[#FFF3CD] px-3.5 py-2.5">
                <TriangleAlert className="h-4 w-4 shrink-0 text-[#92400E]" />
                <span className="text-[13px] text-[#92400E]">
                  Algumas perguntas não foram respondidas. Você pode prosseguir ou voltar para
                  completar.
                </span>
              </div>
            )}
            <Button size="lg" onClick={next}>
              Confirmar e continuar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setAIdx(0);
                back();
              }}
            >
              <ChevronLeft className="h-4 w-4" /> Editar respostas
            </Button>
          </div>
        )}

        {/* 3 — Orientações de captura */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="mb-1 text-xl">Orientações para a captura</h2>
              <p className="text-muted-foreground text-sm">
                Siga estas instruções para obter uma imagem de qualidade
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {ORIENTACOES_CAPTURA.map(({ Icon, title, desc }) => (
                <Card key={title} className="rounded-lg p-3.5 shadow-sm ring-0">
                  <Icon className="text-primary mb-2 h-6 w-6" />
                  <div className="font-heading mb-0.5 text-[13px] font-bold">{title}</div>
                  <div className="text-muted-foreground text-[11px]">{desc}</div>
                </Card>
              ))}
            </div>
            <Button size="lg" onClick={next}>
              Preparar câmera
            </Button>
            <Button variant="ghost" onClick={back}>
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
          </div>
        )}

        {/* 4 — Captura */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground text-center text-sm">
              Posicione sua língua dentro da área indicada
            </p>
            <div className="relative aspect-square overflow-hidden rounded-[20px] bg-[#0a3d4a]">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 30% 70%, rgba(22,163,74,0.15), transparent 60%)",
                }}
              />
              <div className="relative flex h-full items-center justify-center">
                <div className="aspect-[1.4] w-[70%] rounded-[30px] border border-dashed border-white/20" />
              </div>
              <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 rounded-4xl bg-[#4ade80] px-3 py-1">
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                <span className="font-heading text-[11px] font-bold text-[#065F46]">Pronto</span>
              </div>
            </div>
            <Button size="lg" onClick={next} className="bg-[#16A34A] hover:bg-[#15803d]">
              <Camera className="h-4.5 w-4.5" /> Capturar foto
            </Button>
            <button
              onClick={next}
              className="border-border text-primary font-heading border-1.5 bg-background flex items-center justify-center gap-2 rounded-2xl border-dashed p-3.5 text-sm font-semibold"
            >
              <ImageUp className="h-4.5 w-4.5" />
              Escolher da galeria
            </button>
            <Button variant="ghost" onClick={back}>
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
          </div>
        )}

        {/* 5 — Revisar imagem */}
        {step === 5 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="mb-1 text-xl">A imagem está boa?</h2>
              <p className="text-muted-foreground text-sm">
                Verifique se a língua está nítida e bem enquadrada
              </p>
            </div>
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[20px] bg-[#0a3d4a]">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(11,107,130,0.25), transparent 70%)",
                }}
              />
              <div className="relative flex flex-col items-center gap-1.5">
                <div className="h-17.5 w-30 rounded-[50%_50%_40%_40%] border border-white/12 bg-white/6" />
                <div className="font-heading text-[11px] text-white/35">Imagem capturada</div>
              </div>
            </div>
            <Button
              size="lg"
              onClick={confirmarAnamneseECaptura}
              disabled={criarAnamnese.isPending || criarDiagnostico.isPending}
              className="bg-[#16A34A] hover:bg-[#15803d]"
            >
              <Check className="h-4 w-4" />
              {criarAnamnese.isPending || criarDiagnostico.isPending
                ? "Enviando…"
                : "Usar esta foto"}
            </Button>
            <Button variant="secondary" onClick={() => setStep(4)}>
              <Camera className="h-4 w-4" /> Tirar novamente
            </Button>
          </div>
        )}

        {/* 6 — Processando (mostrado só brevemente: a "análise" do mock já volta pronta) */}
        {step === 6 && !resultado && (
          <ScanLoader
            title="Analisando sua imagem"
            subtitle="Nossa inteligência artificial está processando o diagnóstico. Isso pode levar alguns instantes."
          />
        )}

        {/* 7 — Resultado */}
        {step === 6 && resultado && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2.5 rounded-2xl border border-[#FFC107] bg-[#FFF3CD] px-4 py-3">
              <TriangleAlert className="h-4.5 w-4.5 shrink-0 text-[#92400E]" />
              <div>
                <div className="font-heading mb-0.5 text-[13px] font-bold text-[#92400E]">
                  Pré-Diagnóstico
                </div>
                <p className="text-xs leading-relaxed text-[#92400E]">
                  Este resultado é gerado automaticamente por IA e deve ser confirmado por um
                  especialista Hality. Não substitui avaliação clínica.
                </p>
              </div>
            </div>

            <div
              className="relative overflow-hidden rounded-[20px] p-7 text-center"
              style={{ background: "var(--gradient-brand)" }}
            >
              <div className="font-heading mb-4 text-[11px] font-bold tracking-widest text-white/50 uppercase">
                Resultado do pré-diagnóstico
              </div>
              <div
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border-2"
                style={{
                  background: `${nivelColor(resultado.nivel)}20`,
                  borderColor: nivelColor(resultado.nivel),
                }}
              >
                <ScanLine className="h-9 w-9" style={{ color: nivelColor(resultado.nivel) }} />
              </div>
              <LevelChip nivel={resultado.nivel} size="lg" />
              {resultado.confiancaIA && (
                <div className="mt-2.5 text-xs text-white/50">
                  Confiança da análise: {resultado.confiancaIA}%
                </div>
              )}
            </div>

            <Card className="rounded-lg p-5 shadow-sm ring-0">
              <div className="mb-3.5 flex items-center gap-3.5">
                <div className="bg-background text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]">
                  <ScanLine className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-muted-foreground text-[13px]">Imagem analisada</div>
                  <div className="font-heading text-[13px] font-semibold">
                    {new Date().toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <Badge className="ml-auto">Aguardando revisão</Badge>
              </div>
              <div className="bg-secondary text-primary rounded-xl px-3.5 py-2.5 text-[13px]">
                Um especialista Hality irá revisar este pré-diagnóstico em breve.
              </div>
            </Card>

            <Button size="lg" onClick={() => setStep(7)}>
              Ver orientações
            </Button>
            <Button variant="secondary" onClick={() => router.push(voltarHref)}>
              Voltar ao início
            </Button>
          </div>
        )}

        {/* 8 — Orientações / Dicas */}
        {step === 7 && resultado && (
          <div className="flex flex-col gap-4">
            <div
              className="relative overflow-hidden rounded-[18px] p-4.5"
              style={{ background: "linear-gradient(135deg, #0a3d4a, #0b6b82)" }}
            >
              <div className="relative">
                <div className="font-heading mb-2.5 text-lg font-extrabold text-white">Hality</div>
                <p className="mb-3 text-[13px] leading-relaxed text-white/75">
                  Especialistas em diagnóstico e tratamento do mau hálito com tecnologia e
                  conhecimento. Pioneira no Brasil no exame de cromatografia gasosa da respiração.
                </p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-white/70" />
                    <span className="font-heading text-xs font-semibold text-white/70">
                      0800 404 0404
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-white/70" />
                    <span className="font-heading text-xs font-semibold text-white/70">
                      hality.com.br
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-3.5 w-3.5 text-white/70" />
                    <span className="font-heading text-xs font-semibold text-white/70">
                      Ijuí: drmarcelosaldanha.com.br
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-1 text-xl">Orientações para você</h2>
              <p className="text-muted-foreground text-sm">
                Com base no seu pré-diagnóstico — {nivelLabel(resultado.nivel)}
              </p>
            </div>

            {dicasFiltradas.map((dica) => (
              <TipCard
                key={dica.id}
                titulo={dica.titulo}
                categoria={dica.categoria}
                corpo={dica.corpo}
                formato={dica.formato}
                midiaUrl={dica.midiaUrl}
              />
            ))}

            <Button
              size="lg"
              onClick={() => router.push(voltarHref)}
              className="bg-[#16A34A] hover:bg-[#15803d]"
            >
              Concluir diagnóstico
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
