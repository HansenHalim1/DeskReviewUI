import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  accessConfigured,
  safeReturnPath,
  sessionCookie,
  verifySession,
} from "@/lib/access";
import LoginForm from "./login-form";

export const metadata = {
  title: "Access · deskreview",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeReturnPath((await searchParams).next);
  if (verifySession((await cookies()).get(sessionCookie)?.value))
    redirect(next);
  return <LoginForm next={next} configured={accessConfigured()} />;
}
