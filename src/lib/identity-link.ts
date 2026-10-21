import { identityTokenSchema, type IdentityPurpose } from "@/types/auth";

export type IdentityLinkState = {
  purpose: IdentityPurpose | null;
  status: "loading" | "missing" | "invalid" | "ready";
};

/** Contrato bd395ef: ?purpose=password_reset|invitation&token=..., sem decodificar o token. */
export function readIdentityLink(url: URL, fallback?: IdentityPurpose) {
  const purposes = url.searchParams.getAll("purpose");
  const tokens = url.searchParams.getAll("token");
  const explicitPurpose = purposes.find(
    (value): value is IdentityPurpose => value === "password_reset" || value === "invitation",
  );
  const purpose = explicitPurpose ?? fallback ?? null;
  if (!purpose) return { purpose: null, status: "missing" as const, token: null };
  if (purposes.length > 1 || tokens.length > 1 || (purposes.length > 0 && !explicitPurpose)) {
    return { purpose, status: "invalid" as const, token: null };
  }
  if (!tokens.length || !tokens[0]) return { purpose, status: "missing" as const, token: null };
  if (!identityTokenSchema.safeParse(tokens[0]).success)
    return { purpose, status: "invalid" as const, token: null };
  return { purpose, status: "ready" as const, token: tokens[0] };
}
