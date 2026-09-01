import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { seedProfissionais } from "@/services/mocks/seed-data";

const profissionais = [...seedProfissionais];
const url = (path: string) => `${config.apiBaseUrl}${path}`;

export const profissionaisHandlers = [
  http.get(url("/api/v1/profissionais"), () => HttpResponse.json(profissionais)),

  http.get(url("/api/v1/profissionais/:id"), ({ params }) => {
    const profissional = profissionais.find((p) => p.id === params.id);
    if (!profissional) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(profissional);
  }),
];
