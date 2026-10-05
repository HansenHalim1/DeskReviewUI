import { NextResponse, type NextRequest } from "next/server";
import { accessConfigured, sessionCookie, verifySession } from "@/lib/access";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (["/login", "/api/auth/login", "/api/auth/logout"].includes(path))
    return NextResponse.next();
  if (!accessConfigured())
    return new NextResponse(
      "Website access is not configured. Set the server-side access key and session secret.",
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  if (verifySession(request.cookies.get(sessionCookie)?.value)) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  }
  if (path.startsWith("/api/"))
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  const url = new URL("/login", request.url);
  url.searchParams.set("next", `${path}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|branding/|icon\\.svg$|favicon\\.ico$).*)",
  ],
};
