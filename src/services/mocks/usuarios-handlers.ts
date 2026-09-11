import { http, HttpResponse } from "msw";
import { z } from "zod";
import { config } from "@/lib/config";
import { seedUsuarios } from "@/services/mocks/seed-data";
import { roleSchema, type Usuario } from "@/types/usuario";

const usuarios = [...seedUsuarios];
const url = (path: string) => `${config.apiBaseUrl}${path}`;

const criarUsuarioSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  role: roleSchema,
});

const atualizarUsuarioSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
});

export const usuariosHandlers = [
  http.get(url("/api/v1/usuarios"), () => HttpResponse.json(usuarios)),

  http.get(url("/api/v1/usuarios/:id"), ({ params }) => {
    const usuario = usuarios.find((u) => u.id === params.id);
    if (!usuario) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(usuario);
  }),

  http.post(url("/api/v1/usuarios"), async ({ request }) => {
    const body = criarUsuarioSchema.parse(await request.json());
    const usuario: Usuario = {
      id: `usuario-${crypto.randomUUID()}`,
      ...body,
      criadoEm: new Date().toISOString(),
    };
    usuarios.push(usuario);
    return HttpResponse.json(usuario, { status: 201 });
  }),

  http.put(url("/api/v1/usuarios/:id"), async ({ params, request }) => {
    const index = usuarios.findIndex((u) => u.id === params.id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    const body = atualizarUsuarioSchema.parse(await request.json());
    const atual = usuarios[index];
    if (!atual) return new HttpResponse(null, { status: 404 });
    const atualizado: Usuario = { ...atual, ...body };
    usuarios[index] = atualizado;
    return HttpResponse.json(atualizado);
  }),
];
