import { Suspense } from "react";
import { AvaliacaoContent } from "@/app/profissional/avaliacao/avaliacao-content";

export default function AvaliacaoPage() {
  return (
    <Suspense fallback={null}>
      <AvaliacaoContent />
    </Suspense>
  );
}
