import type { Metadata } from "next";
import DeskReview from "@/components/deskreview/desk-review";
import { requireSession } from "@/lib/access";

export const metadata: Metadata = {
  title: "deskreview · Reviewer workspace",
  description:
    "Evaluate manuscript findings, record your assessment, and prepare approved feedback for authors.",
};

export default async function Page() {
  await requireSession();
  return <DeskReview />;
}
