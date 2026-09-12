import type { LucideIcon } from "lucide-react";
import {
  UserPlus,
  Camera,
  ScanLine,
  FileCheck2,
  Utensils,
  Sparkles,
  Droplets,
  Cigarette,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import cybFullLogo from "@/assets/images/full-logo-check-your-breath.png";
import cybIcon from "@/assets/images/icon-check-your-breath.png";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/scroll-reveal";

/**
 * Repaginação completa da landing (era um porte quase 1:1 de
 * Design/src/components/LandingPage.tsx, simples demais e cheio de
 * emoji como ícone). Mantém a paleta/tipografia da marca (teal/verde,
 * Outfit/Inter) — o "uau" vem de composição, espaço e hierarquia, não
 * de reinventar a identidade visual do resto do app.
 */

const CREDIBILIDADE = [
  { valor: "+10 anos", label: "de experiência da Hality no diagnóstico de halitose" },
  { valor: "100% online", label: "o exame é feito em casa, sem precisar de consultório" },
  { valor: "Segundos", label: "é o tempo que a IA leva pra analisar sua imagem" },
];

const PASSOS: { num: string; titulo: string; desc: string; Icon: LucideIcon }[] = [
  {
    num: "01",
    titulo: "Cadastre-se",
    desc: "Crie sua conta gratuitamente na plataforma CYB.",
    Icon: UserPlus,
  },
  {
    num: "02",
    titulo: "Capture a imagem",
    desc: "Fotografe sua língua seguindo as recomendações de iluminação e posição.",
    Icon: Camera,
  },
  {
    num: "03",
    titulo: "IA analisa",
    desc: "Nossa inteligência artificial identifica padrões associados à halitose.",
    Icon: ScanLine,
  },
  {
    num: "04",
    titulo: "Receba o diagnóstico",
    desc: "Veja o resultado detalhado com dicas de tratamento personalizadas.",
    Icon: FileCheck2,
  },
];

const CAUSAS: { titulo: string; desc: string; Icon: LucideIcon }[] = [
  {
    titulo: "Alimentação",
    desc: "A quebra de partículas de comida nos dentes pode aumentar o número de bactérias e causar odor desagradável.",
    Icon: Utensils,
  },
  {
    titulo: "Higienização oral falha",
    desc: "Sem escovação e fio dental diários, partículas de comida permanecem na boca, causando mau hálito e saburra lingual.",
    Icon: Sparkles,
  },
  {
    titulo: "Boca seca",
    desc: "A saliva ajuda a limpar a boca removendo partículas que causam odor — a xerostomia pode contribuir para o mau hálito.",
    Icon: Droplets,
  },
  {
    titulo: "Tabagismo",
    desc: "Fumar causa mau odor característico, além de maior chance de problemas na gengiva.",
    Icon: Cigarette,
  },
];

const RECOMENDACOES = [
  "Preencher corretamente o formulário de anamnese",
  "Realizar a foto conforme a demonstração no aplicativo",
  "Fotografar com o celular na posição indicada e o flash ligado",
  "Realizar o exame pela manhã, em jejum",
  "Não usar antisséptico bucal antes do exame",
  "Manter-se hidratado(a) antes da captura",
];

export default function LandingPage() {
  return (
    <div className="min-h-full bg-white">
      {/* Hero */}
      <section className="shell:px-6 shell:pt-24 shell:pb-28 relative isolate overflow-hidden px-4 pt-16 pb-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(60% 50% at 50% 0%, rgba(11,107,130,0.06), transparent)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-[-10%] right-[2%] -z-10 h-125 w-125 rounded-full"
          style={{ background: "rgba(13,138,166,0.3)", filter: "blur(90px)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-[15%] left-[-8%] -z-10 h-90 w-90 rounded-full"
          style={{ background: "rgba(22,163,74,0.22)", filter: "blur(80px)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-20%] left-[20%] -z-10 h-110 w-110 rounded-full"
          style={{ background: "rgba(13,138,166,0.16)", filter: "blur(100px)" }}
        />
        <div className="shell:grid-cols-[1.1fr_0.9fr] shell:gap-16 mx-auto grid max-w-6xl items-center gap-14">
          <ScrollReveal>
            <div className="shell:text-left text-center">
              <Image
                src={cybFullLogo}
                alt="Check Your Breath"
                className="shell:mx-0 mx-auto mb-8 h-32 w-auto object-contain"
                priority
              />
              <h1 className="font-heading shell:mx-0 mx-auto max-w-xl text-[clamp(34px,6vw,64px)] leading-[1.05] font-extrabold text-[#0F2A35]">
                Entenda seu hálito.
                <br />
                <span className="text-primary">Em segundos</span>, com IA.
              </h1>
              <p className="text-muted-foreground shell:mx-0 mx-auto mt-6 max-w-md text-lg leading-relaxed">
                Fotografe sua língua e receba um diagnóstico de halitose gerado por inteligência
                artificial — sem sair de casa.
              </p>
              <div className="shell:flex-row shell:items-center shell:justify-start mt-9 flex flex-col items-center gap-4">
                <Button size="lg" variant="success" asChild>
                  <Link href="/registro">
                    Realizar diagnóstico gratuito <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Link href="/login" className="text-primary text-sm font-semibold hover:underline">
                  Já tenho conta →
                </Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={120}>
            <div className="relative mx-auto flex max-w-70 justify-center">
              <div
                className="shell:h-115 shell:w-72 relative h-100 w-62 overflow-hidden rounded-[38px] bg-[#0F2A35] p-2.5"
                style={{ boxShadow: "0 40px 100px rgba(11,107,130,0.28)" }}
              >
                <div
                  className="flex h-full w-full flex-col items-center justify-between rounded-[30px] px-5 py-6"
                  style={{ background: "linear-gradient(180deg, #0B6B82 0%, #0a3d4a 100%)" }}
                >
                  <div className="flex w-full items-center justify-between">
                    <Image
                      src={cybIcon}
                      alt=""
                      className="h-6 w-auto object-contain opacity-90 brightness-0 invert"
                    />
                    <div className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center gap-4">
                    <div className="relative flex h-36 w-36 items-center justify-center rounded-3xl border-2 border-dashed border-white/25">
                      <div className="absolute top-[-2px] left-[-2px] h-5 w-5 rounded-tl-xl border-t-2 border-l-2 border-[#4ade80]" />
                      <div className="absolute top-[-2px] right-[-2px] h-5 w-5 rounded-tr-xl border-t-2 border-r-2 border-[#4ade80]" />
                      <div className="absolute bottom-[-2px] left-[-2px] h-5 w-5 rounded-bl-xl border-b-2 border-l-2 border-[#4ade80]" />
                      <div className="absolute right-[-2px] bottom-[-2px] h-5 w-5 rounded-br-xl border-r-2 border-b-2 border-[#4ade80]" />
                      <ScanLine className="h-11 w-11 text-white/70" />
                    </div>
                    <p className="max-w-44 text-center text-xs text-white/60">
                      Posicione a língua dentro do quadro
                    </p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white/20 bg-white">
                    <Camera className="text-primary h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="shell:right-[-2rem] absolute top-6 right-0 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
                <div>
                  <div className="font-heading text-xs font-bold text-[#16A34A]">IA analisando</div>
                  <div className="text-muted-foreground text-[11px]">Resultado em segundos</div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Credibilidade */}
      <section className="border-border/60 shell:px-6 border-y bg-white px-4 py-10">
        <ScrollReveal>
          <div className="shell:grid-cols-3 mx-auto grid max-w-4xl grid-cols-1 gap-8 text-center">
            {CREDIBILIDADE.map((item) => (
              <div key={item.valor}>
                <div className="font-heading text-primary text-3xl font-extrabold">
                  {item.valor}
                </div>
                <p className="text-muted-foreground mt-1.5 text-sm leading-snug">{item.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="shell:px-6 shell:py-28 bg-[#F0F9FF] px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="mb-16 text-center">
              <h2 className="font-heading shell:text-4xl mb-3 text-[28px] font-extrabold text-[#0F2A35]">
                Como funciona
              </h2>
              <p className="text-muted-foreground text-base">
                Diagnóstico rápido em 4 passos simples
              </p>
            </div>
          </ScrollReveal>
          <div className="shell:grid-cols-4 shell:gap-6 relative grid grid-cols-1 gap-10">
            <div
              aria-hidden
              className="border-border shell:block absolute top-7 right-[12%] left-[12%] hidden border-t border-dashed"
            />
            {PASSOS.map((passo, i) => (
              <ScrollReveal key={passo.num} delay={i * 80}>
                <div className="relative flex flex-col items-center text-center">
                  <div className="bg-secondary text-primary relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
                    <passo.Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading mb-2 text-[17px] font-bold text-[#0F2A35]">
                    {passo.titulo}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{passo.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Causas */}
      <section id="causas" className="shell:px-6 shell:py-28 bg-white px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="mb-16 text-center">
              <h2 className="font-heading shell:text-4xl mb-3 text-[28px] font-extrabold text-[#0F2A35]">
                Causas da halitose
              </h2>
              <p className="text-muted-foreground text-base">
                Entenda os principais fatores que causam o mau hálito
              </p>
            </div>
          </ScrollReveal>
          <div className="shell:grid-cols-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {CAUSAS.map((causa, i) => (
              <ScrollReveal key={causa.titulo} delay={i * 80}>
                <div className="border-border h-full rounded-2xl border bg-[#F0F9FF] p-7">
                  <div className="bg-secondary text-primary mb-4 flex h-11 w-11 items-center justify-center rounded-xl">
                    <causa.Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading mb-2 text-base font-bold text-[#0F2A35]">
                    {causa.titulo}
                  </h3>
                  <p className="text-muted-foreground text-[13px] leading-relaxed">{causa.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Recomendações */}
      <section className="shell:px-6 shell:py-28 bg-[#F0F9FF] px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <div className="mb-10 text-center">
              <h2 className="font-heading shell:text-4xl mb-3 text-[28px] font-extrabold text-[#0F2A35]">
                Recomendações para o exame
              </h2>
              <p className="text-muted-foreground text-base">
                Siga essas orientações para garantir um diagnóstico preciso
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <div className="border-border shell:p-10 rounded-3xl border bg-white p-8">
              <div className="shell:grid-cols-2 grid grid-cols-1 gap-5">
                {RECOMENDACOES.map((texto) => (
                  <div key={texto} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#16A34A]" />
                    <span className="text-sm leading-snug text-[#0F2A35]">{texto}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={160}>
            <div className="mt-10 text-center">
              <Button size="lg" variant="success" asChild>
                <Link href="/registro">
                  Realizar diagnóstico <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA profissionais */}
      <section
        className="shell:px-6 shell:py-28 relative isolate overflow-hidden px-4 py-20"
        style={{ background: "linear-gradient(135deg, #0a3d4a, #0B6B82)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute top-[-20%] left-[-10%] h-90 w-90 rounded-full"
          style={{ background: "rgba(22,163,74,0.25)", filter: "blur(90px)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-10%] bottom-[-25%] h-100 w-100 rounded-full"
          style={{ background: "rgba(13,138,166,0.35)", filter: "blur(100px)" }}
        />
        <ScrollReveal>
          <div className="relative mx-auto max-w-2xl text-center">
            <Image
              src={cybFullLogo}
              alt="Check Your Breath"
              className="mx-auto mb-8 h-12 w-auto object-contain brightness-0 invert"
            />
            <h2 className="font-heading shell:text-4xl mb-4 text-[28px] font-extrabold text-white">
              Caro Dr(a), faça parte dessa revolução
            </h2>
            <p className="mb-8 text-base leading-relaxed text-white/75">
              Iniciamos uma nova fase no diagnóstico da halitose e desde já agradecemos sua
              disponibilidade em ajudar a desenvolver nosso sistema.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" variant="success" asChild>
                <Link href="/registro">Criar conta grátis</Link>
              </Button>
              <button className="font-heading rounded-[12px] border border-white/30 bg-white/10 px-6 py-3.75 text-[15px] font-bold text-white transition-colors hover:bg-white/15">
                Entrar em contato
              </button>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F2A35] px-6 py-10 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Image
            src={cybIcon}
            alt=""
            className="h-5 w-auto object-contain opacity-60 brightness-0 invert"
          />
          <span className="font-heading text-xs font-bold text-white/60">Check Your Breath</span>
        </div>
        <p className="text-[13px] text-white/40">
          © 2026 Hality Diagnóstico do Hálito — Check Your Breath (CYB). Todos os direitos
          reservados.
        </p>
      </footer>
    </div>
  );
}
