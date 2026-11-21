import type { Metadata } from "next";
import { PrivacyPage } from "@/components/PrivacyPage";

export const metadata: Metadata = {
  title: "Privacy · Find Me Penguin",
};

export default function Page() {
  return <PrivacyPage />;
}
