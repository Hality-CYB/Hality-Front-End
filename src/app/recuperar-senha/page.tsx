import Link from "next/link";

// Fluxo completo de recuperação de senha é a US-013. Este placeholder
// existe só para o link "Esqueceu sua senha?" da tela de login levar a
// algum lugar navegável.
export default function RecuperarSenhaPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Recuperar senha</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Fluxo de recuperação de senha (US-013) ainda em desenvolvimento.
      </p>
      <Link href="/login" className="text-brand-700 hover:text-brand-800 text-sm font-semibold">
        Voltar para o login
      </Link>
    </div>
  );
}
