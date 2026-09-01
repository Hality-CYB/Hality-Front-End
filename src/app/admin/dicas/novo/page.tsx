import { DicaForm } from "@/components/dica-form";

export default function NovaDicaPage() {
  return (
    <div className="flex flex-col p-4">
      <h1 className="mb-4 text-xl">Nova dica de saúde</h1>
      <DicaForm />
    </div>
  );
}
