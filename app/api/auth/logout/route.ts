import { NextResponse, type NextRequest } from "next/server";
import { sessionCookie } from "@/lib/access";

export function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(sessionCookie, "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:" || process.env.VERCEL === "1",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
