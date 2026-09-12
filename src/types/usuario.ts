import { z } from "zod";

export const roleSchema = z.enum(["paciente", "profissional", "admin"]);
export type Role = z.infer<typeof roleSchema>;

export const backendRoleSchema = z.enum(["patient", "professional", "admin"]);
export type BackendRole = z.infer<typeof backendRoleSchema>;

export function mapBackendRoleToFrontend(role: string): Role {
  if (role === "patient" || role === "paciente") return "paciente";
  if (role === "professional" || role === "profissional") return "profissional";
  if (role === "admin") return "admin";
  return "paciente";
}

export function mapFrontendRoleToBackend(role: Role): string {
  if (role === "paciente") return "patient";
  if (role === "profissional") return "professional";
  return "admin";
}

export const usuarioSchema = z.object({
  id: z.string(),
  nome: z.string().min(1),
  email: z.string().email(),
  role: roleSchema,
  telefone: z.string().nullable().optional(),
  criadoEm: z.string().optional(),
  ativo: z.boolean().optional(),
});
export type Usuario = z.infer<typeof usuarioSchema>;

export const backendUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  role: z.string(),
  is_active: z.boolean(),
  is_superuser: z.boolean().optional(),
  is_verified: z.boolean().optional(),
  created_at: z.string().optional(),
});
export type BackendUser = z.infer<typeof backendUserSchema>;

export function adaptBackendUser(data: BackendUser): Usuario {
  return {
    id: data.id,
    nome: data.name,
    email: data.email,
    role: mapBackendRoleToFrontend(data.role),
    telefone: data.phone ?? undefined,
    criadoEm: data.created_at,
    ativo: data.is_active,
  };
}
