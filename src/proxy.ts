import { NextResponse, type NextRequest } from "next/server";
import { readIdentityLink } from "@/lib/identity-link";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (readIdentityLink(request.nextUrl).purpose) {
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  return response;
}

export const config = { matcher: "/" };
