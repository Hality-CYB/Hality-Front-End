import { NextResponse, type NextRequest } from "next/server";
import { lerLinkDeAcesso } from "@/lib/link-de-acesso";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (lerLinkDeAcesso(request.nextUrl).finalidade) {
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  return response;
}

export const config = { matcher: "/" };
