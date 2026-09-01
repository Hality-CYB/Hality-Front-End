import Image from "next/image";
import Link from "next/link";
import cybFullLogo from "@/assets/images/full-logo-check-your-breath.png";

/**
 * Porta Design/src/components/LandingPage.tsx quase 1:1 — inclusive a
 * paleta própria da landing (não a mesma dos apps de papel), já que era
 * assim no original. `onNavigate('register'|'login')` virou <Link>
 * direto pras rotas reais.
 */

const CAUSAS = [
  {
    icone: "🐟",
    titulo: "Alimentação",
    desc: "A quebra de partículas de comidas nos dentes pode aumentar o número de bactérias e causar odor desagradável.",
  },
  {
    icone: "🦷",
    titulo: "Higienização Oral Falha",
    desc: "Se você não escova os dentes e passa fio dental diariamente, partículas de comida permanecem na boca, causando mau hálito e saburra lingual.",
  },
  {
    icone: "🚬",
    titulo: "Tabagismo",
    desc: "Fumar causa mau odor característico. Fumantes também têm maior possibilidade de apresentar problemas na gengiva.",
  },
  {
    icone: "💧",
    titulo: "Boca Seca",
    desc: "A saliva ajuda a limpar a boca, removendo partículas que causam mau odor. A xerostomia pode contribuir para o mau hálito.",
  },
  {
    icone: "💊",
    titulo: "Medicação",
    desc: "Alguns medicamentos podem produzir mau hálito ao contribuírem com a boca seca ou ao liberar componentes químicos na respiração.",
  },
  {
    icone: "🦠",
    titulo: "Infecções Na Boca",
    desc: "O mau hálito pode ser causado pelas feridas resultantes de uma cirurgia oral, como a remoção de dentes ou ainda causado por cáries e gengivite.",
  },
  {
    icone: "👃",
    titulo: "Problemas de Nariz e Garganta",
    desc: "O mau hálito pode derivar de pequenos nódulos que se formam nas amígdalas e são cobertos por bactérias que produzem cheiro.",
  },
];

const PASSOS = [
  { num: "01", titulo: "Cadastre-se", desc: "Crie sua conta gratuitamente na plataforma CYB." },
  {
    num: "02",
    titulo: "Capture a imagem",
    desc: "Fotografe sua língua seguindo as recomendações de iluminação e posição.",
  },
  {
    num: "03",
    titulo: "IA analisa",
    desc: "Nossa inteligência artificial analisa a imagem e identifica padrões associados à halitose.",
  },
  {
    num: "04",
    titulo: "Receba o diagnóstico",
    desc: "Veja o resultado detalhado com dicas de tratamento personalizadas.",
  },
];

const RECOMENDACOES = [
  { icone: "📋", texto: "Preencher corretamente o formulário de anamnese" },
  { icone: "📸", texto: "Realizar a foto conforme a demonstração no aplicativo" },
  { icone: "🔦", texto: "Com o celular na posição foto com flash ligado faça uma foto" },
  { icone: "🌅", texto: "Realizar o exame pela manhã, em jejum" },
  { icone: "🚫", texto: "Não usar antisséptico bucal antes do exame" },
  { icone: "💧", texto: "Manter-se hidratado(a) antes da captura" },
];

export default function LandingPage() {
  return (
    <div className="min-h-full bg-[#F0F9FF]">
      {/* Hero */}
      <section
        className="shell:px-6 shell:py-20 px-4 py-10"
        style={{ background: "linear-gradient(135deg, #E0F4F8 0%, #F0F9FF 60%, #D4EDDA 100%)" }}
      >
        <div className="mx-auto mb-0 flex max-w-275 flex-wrap items-center justify-between gap-4">
          <Image
            src={cybFullLogo}
            alt="Check Your Breath"
            className="h-37.5 w-auto object-contain"
            priority
          />
        </div>
        <div className="shell:grid-cols-2 shell:gap-15 mx-auto grid max-w-275 items-center gap-10">
          <div className="shell:text-left text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-4xl bg-[#C8EAD4] px-4 py-1.5">
              <span className="font-heading text-xs font-semibold tracking-wide text-[#16A34A]">
                TECNOLOGIA &amp; IA
              </span>
            </div>
            <h1 className="font-heading shell:mx-0 mx-auto mb-5 max-w-140 text-[clamp(28px,6vw,52px)] leading-[1.1] font-extrabold text-[#0F2A35]">
              Diagnóstico inteligente do
              <br />
              <span className="text-[#0B6B82]">mau hálito</span> com IA
            </h1>
            <p className="shell:mx-0 mx-auto mb-9 max-w-115 text-base leading-relaxed text-[#5A7A85]">
              Pioneira no Brasil, a Hality é especialista no diagnóstico e tratamento da halitose há
              mais de 10 anos. Agora com inteligência artificial para análise de imagens da língua.
            </p>
            <div className="shell:justify-start flex flex-wrap justify-center gap-3">
              <Link
                href="/registro"
                className="font-heading rounded-[10px] bg-[#16A34A] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(22,163,74,0.35)]"
              >
                Realizar Diagnóstico
              </Link>
              <Link
                href="/login"
                className="font-heading rounded-[10px] border-2 border-[#0B6B82] bg-white px-7 py-3.5 text-[15px] font-bold text-[#0B6B82]"
              >
                Já tenho conta
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div
              className="shell:h-120 shell:w-70 relative h-95 w-55 overflow-hidden rounded-[40px] bg-[#0F2A35] p-3"
              style={{ boxShadow: "0 30px 80px rgba(11,107,130,0.25)" }}
            >
              <div
                className="flex h-full w-full flex-col items-center justify-between rounded-[30px] px-4 py-5"
                style={{ background: "linear-gradient(180deg, #0B6B82 0%, #0a4f61 100%)" }}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-[11px] text-white">Check Your Breath</span>
                  <div className="h-2 w-2 rounded-full bg-[#4ade80]" />
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                  <div className="relative flex h-45 w-45 items-center justify-center rounded-2xl border-2 border-dashed border-white/50">
                    <div className="absolute top-[-1px] left-[-1px] h-4 w-4 [border-top-left-radius:8px] border-t-2 border-l-2 border-[#4ade80]" />
                    <div className="absolute top-[-1px] right-[-1px] h-4 w-4 [border-top-right-radius:8px] border-t-2 border-r-2 border-[#4ade80]" />
                    <div className="absolute bottom-[-1px] left-[-1px] h-4 w-4 [border-bottom-left-radius:8px] border-b-2 border-l-2 border-[#4ade80]" />
                    <div className="absolute right-[-1px] bottom-[-1px] h-4 w-4 [border-bottom-right-radius:8px] border-r-2 border-b-2 border-[#4ade80]" />
                    <span className="text-6xl">👅</span>
                  </div>
                  <p className="max-w-40 text-center text-[11px] text-white/70">
                    Posicione sua língua dentro do enquadramento
                  </p>
                </div>
                <button className="flex h-15 w-15 items-center justify-center rounded-full border-[3px] border-white/30 bg-white text-2xl">
                  📷
                </button>
              </div>
            </div>
            <div className="absolute top-5 right-0 rounded-xl bg-white px-3.5 py-2.5 whitespace-nowrap shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
              <div className="font-heading text-[11px] font-bold text-[#16A34A]">
                ✓ IA Analisando
              </div>
              <div className="text-[10px] text-[#5A7A85]">Resultado em segundos</div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="shell:px-6 shell:py-20 bg-white px-4 py-10">
        <div className="mx-auto max-w-275">
          <div className="mb-14 text-center">
            <h2 className="font-heading shell:text-4xl mb-3 text-[28px] font-extrabold text-[#0F2A35]">
              Como funciona
            </h2>
            <p className="text-base text-[#5A7A85]">Diagnóstico rápido em 4 passos simples</p>
          </div>
          <div className="shell:grid-cols-4 grid grid-cols-1 gap-6">
            {PASSOS.map((passo) => (
              <div key={passo.num} className="p-6 text-center">
                <div className="font-heading mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E0F4F8] text-lg font-extrabold text-[#0B6B82]">
                  {passo.num}
                </div>
                <h3 className="font-heading mb-2 text-[17px] font-bold text-[#0F2A35]">
                  {passo.titulo}
                </h3>
                <p className="text-sm leading-relaxed text-[#5A7A85]">{passo.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recomendações */}
      <section className="shell:px-6 shell:py-20 bg-[#F0F9FF] px-4 py-10">
        <div className="mx-auto max-w-275">
          <div className="mb-14 text-center">
            <h2 className="font-heading shell:text-4xl mb-3 text-[28px] font-extrabold text-[#0F2A35]">
              Recomendações para o Exame
            </h2>
            <p className="text-base text-[#5A7A85]">
              Siga essas orientações para garantir um diagnóstico preciso
            </p>
          </div>
          <div className="shell:grid-cols-3 mb-6 grid grid-cols-1 gap-4">
            {RECOMENDACOES.map((rec) => (
              <div
                key={rec.texto}
                className="flex items-center gap-3 rounded-xl border border-[#C5E2EA] bg-white p-4"
              >
                <span className="text-2xl">{rec.icone}</span>
                <span className="text-sm leading-snug text-[#0F2A35]">{rec.texto}</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link
              href="/registro"
              className="font-heading inline-block rounded-[10px] bg-[#16A34A] px-10 py-4 text-base font-bold text-white shadow-[0_4px_14px_rgba(22,163,74,0.3)]"
            >
              REALIZAR DIAGNÓSTICO
            </Link>
          </div>
        </div>
      </section>

      {/* Causas */}
      <section className="shell:px-6 shell:py-20 bg-white px-4 py-10">
        <div className="mx-auto max-w-275">
          <div className="mb-14 text-center">
            <h2 className="font-heading shell:text-4xl mb-3 text-[28px] font-extrabold text-[#0F2A35]">
              Causas da Halitose
            </h2>
            <p className="text-base text-[#5A7A85]">
              Entenda os principais fatores que causam o mau hálito
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
            {CAUSAS.map((causa) => (
              <div
                key={causa.titulo}
                className="rounded-2xl border border-[#C5E2EA] bg-[#F0F9FF] p-6"
              >
                <div className="mb-3 text-4xl">{causa.icone}</div>
                <h3 className="font-heading mb-2 text-base font-bold text-[#0B6B82]">
                  {causa.titulo}
                </h3>
                <p className="text-[13px] leading-relaxed text-[#5A7A85]">{causa.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="shell:px-6 shell:py-20 px-4 py-10"
        style={{ background: "linear-gradient(135deg, #0B6B82, #0a4f61)" }}
      >
        <div className="mx-auto max-w-175 text-center">
          <div className="mb-6 inline-block rounded-2xl bg-white px-4.5 py-2.5">
            <Image
              src={cybFullLogo}
              alt="Check Your Breath"
              className="block h-8 w-auto object-contain"
            />
          </div>
          <h2 className="font-heading shell:text-4xl mb-4 text-[28px] font-extrabold text-white">
            Caro Dr(a), faça parte dessa revolução
          </h2>
          <p className="mb-8 text-base leading-relaxed text-white/80">
            Iniciamos uma nova fase no diagnóstico da halitose e desde já agradecemos sua
            disponibilidade em ajudar a desenvolver nosso sistema.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/registro"
              className="font-heading rounded-[10px] bg-[#16A34A] px-7 py-3.5 text-[15px] font-bold text-white"
            >
              Criar conta grátis
            </Link>
            <button className="font-heading rounded-[10px] border border-white/30 bg-white/15 px-7 py-3.5 text-[15px] font-bold text-white">
              Entrar em Contato
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F2A35] px-6 py-8 text-center">
        <p className="text-[13px] text-white/40">
          © 2026 Hality Diagnóstico do Hálito — Check Your Breath (CYB). Todos os direitos
          reservados.
        </p>
      </footer>
    </div>
  );
}
