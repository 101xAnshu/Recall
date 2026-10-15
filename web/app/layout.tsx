import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const interDisplay = Inter({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-inter-display",
});

export const metadata: Metadata = {
  title: "Recall - Meridian Pay",
  description:
    "An institutional-memory agent: traced answers, blast radius, expertise, memory and approvals.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${geist.variable} ${geistMono.variable} ${interDisplay.variable} relative z-0 font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
