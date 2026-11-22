import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Geist, Newsreader } from "next/font/google";
import { getSiteConfig, privateMetadata } from "@/lib/seo";
import "./globals.css";
import "./product.css";
import "./marketing.css";
const bodyFont = Geist({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const editorialFont = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-editorial",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(getSiteConfig().origin || "http://localhost:3000"),
  title: {
    default: "ClientBrief — Your agency’s after-meeting workspace",
    template: "%s | ClientBrief",
  },
  description:
    "Turn client meeting recordings into project briefs, action items, and follow-up drafts.",
  ...privateMetadata,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${bodyFont.variable} ${editorialFont.variable}`}
    >
      <body>
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider
            appearance={{
              theme: shadcn,
              variables: {
                colorPrimary: "#111111",
                colorPrimaryForeground: "#ffffff",
                colorBackground: "#ffffff",
                colorForeground: "#18181b",
                colorMuted: "#f1f1f3",
                colorMutedForeground: "#5d5d66",
                colorBorder: "#dedee3",
                colorInput: "#ffffff",
                colorInputForeground: "#18181b",
                colorRing: "#18181b55",
                colorSuccess: "#2d6349",
                colorDanger: "#a0382f",
                fontFamily: "var(--font-body), Arial, sans-serif",
                borderRadius: "0.25rem",
              },
            }}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInForceRedirectUrl="/app"
            signUpForceRedirectUrl="/app"
          >
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
