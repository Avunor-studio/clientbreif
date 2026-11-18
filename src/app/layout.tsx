import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Instrument_Serif, Manrope } from "next/font/google";
import { getSiteConfig, privateMetadata } from "@/lib/seo";
import "./globals.css";
import "./product.css";
import "./marketing.css";
const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});
const editorialFont = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
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
                colorPrimary: "#6f2737",
                colorPrimaryForeground: "#ffffff",
                colorBackground: "#fffcf7",
                colorForeground: "#252521",
                colorMuted: "#eee8de",
                colorMutedForeground: "#6d6862",
                colorBorder: "#ddd6ca",
                colorInput: "#fffdfa",
                colorInputForeground: "#252521",
                colorRing: "#6f273740",
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
