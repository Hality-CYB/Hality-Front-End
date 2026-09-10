import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { seedDicas } from "@/services/mocks/seed-data";
import { dicaSchema, type Dica } from "@/types/dica";

const dicas = [...seedDicas];
const url = (path: string) => `${config.apiBaseUrl}${path}`;

const criarDicaSchema = dicaSchema.omit({ id: true, criadoEm: true, visualizacoes: true });

export const dicasHandlers = [
  http.get(url("/api/v1/dicas"), ({ request }) => {
    const publicadoParam = new URL(request.url).searchParams.get("publicado");
    const filtradas =
      publicadoParam === null ? dicas : dicas.filter((d) => String(d.publicado) === publicadoParam);
    return HttpResponse.json([...filtradas].sort((a, b) => a.ordem - b.ordem));
  }),

  http.get(url("/api/v1/dicas/:id"), ({ params }) => {
    const dica = dicas.find((d) => d.id === params.id);
    if (!dica) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(dica);
  }),

  http.post(url("/api/v1/dicas"), async ({ request }) => {
    const body = criarDicaSchema.parse(await request.json());
    const dica: Dica = {
      id: `dica-${crypto.randomUUID()}`,
      ...body,
      criadoEm: new Date().toISOString(),
      visualizacoes: 0,
    };
    dicas.push(dica);
    return HttpResponse.json(dica, { status: 201 });
  }),

  http.put(url("/api/v1/dicas/:id"), async ({ params, request }) => {
    const index = dicas.findIndex((d) => d.id === params.id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    const body = criarDicaSchema.partial().parse(await request.json());
    const atual = dicas[index];
    if (!atual) return new HttpResponse(null, { status: 404 });
    const atualizada = { ...atual, ...body };
    dicas[index] = atualizada;
    return HttpResponse.json(atualizada);
  }),
];
