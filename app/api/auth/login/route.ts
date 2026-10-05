import { NextResponse, type NextRequest } from "next/server";
import {
  accessConfigured,
  checkAccessKey,
  issueSession,
  safeReturnPath,
  sessionCookie,
  sessionLifetime,
} from "@/lib/access";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  if (!accessConfigured())
    return NextResponse.json(
      { error: "Website access is not configured." },
      { status: 503 },
    );
  if (Number(request.headers.get("content-length") ?? "0") > 4096)
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  try {
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      !("key" in body) ||
      typeof body.key !== "string" ||
      !checkAccessKey(body.key.trim())
    )
      return NextResponse.json(
        { error: "The access key is incorrect." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    const next = safeReturnPath("next" in body ? body.next : undefined);
    const response = NextResponse.json(
      { next },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(sessionCookie, issueSession(), {
      httpOnly: true,
      secure:
        request.nextUrl.protocol === "https:" || process.env.VERCEL === "1",
      sameSite: "strict",
      path: "/",
      maxAge: sessionLifetime,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "The request could not be read." },
      { status: 400 },
    );
  }
}
