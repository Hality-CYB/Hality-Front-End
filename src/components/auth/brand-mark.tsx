/**
 * Marca usada no topo das telas de autenticação. É uma composição simples
 * (não o logotipo oficial em arquivo) — trocar por `next/image` apontando
 * para o asset definitivo assim que ele estiver disponível no repo.
 */
export function BrandMark() {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        aria-hidden="true"
        className="text-brand-700"
      >
        <circle cx="28" cy="28" r="27" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
        <path
          d="M14 30c4-8 10-12 14-12s8 3 10 7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M16 36c3-3 7-4 10-4s6 1.5 8 4"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        <circle cx="38" cy="20" r="2.5" fill="currentColor" />
        <circle cx="43" cy="26" r="1.8" fill="currentColor" opacity="0.7" />
        <circle cx="20" cy="18" r="1.6" fill="currentColor" opacity="0.5" />
      </svg>

      <div className="text-center leading-tight">
        <p className="text-xl font-bold text-gray-900">
          Check <span className="text-brand-700">Your Breath</span>
        </p>
        <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
          by Hality — Diagnóstico e tratamento do mau hálito
        </p>
      </div>
    </div>
  );
}
