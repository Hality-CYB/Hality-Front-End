import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { seedUsuarios } from "@/services/mocks/seed-data";

const usuarios = [...seedUsuarios];
const url = (path: string) => `${config.apiBaseUrl}${path}`;

export const usuariosHandlers = [
  http.get(url("/api/v1/usuarios"), () => HttpResponse.json(usuarios)),

  http.get(url("/api/v1/usuarios/:id"), ({ params }) => {
    const usuario = usuarios.find((u) => u.id === params.id);
    if (!usuario) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(usuario);
  }),
];
