import Link from "next/link";

// Tela de cadastro completa é outra US deste épico (entrada do paciente).
// Este placeholder existe só para o link "Registrar" da tela de login
// levar a algum lugar navegável.
export default function CadastroPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Cadastro</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Tela de cadastro do paciente ainda em desenvolvimento.
      </p>
      <Link href="/login" className="text-brand-700 hover:text-brand-800 text-sm font-semibold">
        Voltar para o login
      </Link>
    </div>
  );
}
