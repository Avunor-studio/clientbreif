import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";
export const metadata: Metadata = { ...privateMetadata, title: "Project intake", referrer: "no-referrer" };
export default function IntakeLayout({ children }: { children: React.ReactNode }) { return children; }
