import "server-only";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const sessionCookie = "deskreview_session";
export const sessionLifetime = 8 * 60 * 60;

export function accessConfigured() {
  return (
    /^[a-f0-9]{64}$/i.test(process.env.DESKREVIEW_ACCESS_KEY ?? "") &&
    /^[a-f0-9]{64}$/i.test(process.env.DESKREVIEW_SESSION_SECRET ?? "")
  );
}
const digest = (value: string) => createHash("sha256").update(value).digest();
export function checkAccessKey(candidate: string) {
  if (!accessConfigured() || !/^[a-f0-9]{64}$/i.test(candidate)) return false;
  return timingSafeEqual(
    digest(candidate.toLowerCase()),
    digest(process.env.DESKREVIEW_ACCESS_KEY!.toLowerCase()),
  );
}
const keyVersion = () =>
  digest(process.env.DESKREVIEW_ACCESS_KEY!.toLowerCase())
    .toString("hex")
    .slice(0, 16);
const sign = (payload: string) =>
  createHmac("sha256", process.env.DESKREVIEW_SESSION_SECRET!)
    .update(payload)
    .digest("hex");

export function issueSession() {
  if (!accessConfigured()) throw new Error("Access is not configured.");
  const payload = `${Math.floor(Date.now() / 1000) + sessionLifetime}.${randomBytes(16).toString("hex")}.${keyVersion()}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySession(token?: string) {
  if (!accessConfigured() || !token || token.length > 200) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [expiry, nonce, version, signature] = parts;
  if (
    !/^\d{10}$/.test(expiry) ||
    !/^[a-f0-9]{32}$/.test(nonce) ||
    !/^[a-f0-9]{16}$/.test(version) ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return false;
  const now = Math.floor(Date.now() / 1000);
  if (
    Number(expiry) <= now ||
    Number(expiry) > now + sessionLifetime + 60 ||
    version !== keyVersion()
  )
    return false;
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(sign(`${expiry}.${nonce}.${version}`), "hex"),
  );
}

export function safeReturnPath(value: unknown) {
  return typeof value === "string" &&
    !/[\\\r\n]/.test(value) &&
    (value === "/" || /^\/deskreview(?:\?|\/|$)/.test(value))
    ? value
    : "/deskreview";
}

export async function requireSession() {
  if (!verifySession((await cookies()).get(sessionCookie)?.value))
    redirect("/login?next=%2Fdeskreview");
}
