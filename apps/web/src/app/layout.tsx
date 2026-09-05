import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TitleChain | Secure Property Transactions on the Blockchain",
    template: "%s | TitleChain",
  },
  description:
    "AI-powered blockchain property transaction platform",
  keywords: [
    "property title",
    "blockchain",
    "real estate",
    "smart contracts",
    "title transfer",
    "KYC",
    "escrow",
    "ethereum",
  ],
  openGraph: {
    title: "TitleChain | Secure Property Transactions on the Blockchain",
    description:
      "AI-powered blockchain property transaction platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
