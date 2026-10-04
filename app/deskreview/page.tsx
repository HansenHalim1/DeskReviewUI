import type { Metadata } from "next";
import DeskReview from "@/components/deskreview/desk-review";

export const metadata: Metadata = {
  title: "deskreview · Reviewer workspace",
  description:
    "Evaluate manuscript findings, record your assessment, and prepare approved feedback for authors.",
};

export default function Page() {
  return <DeskReview />;
}
