import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Caveat } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Boardmarkie — AI Lesson Generator for Teachers",
  description:
    "Create classroom-ready lessons, slide decks, worksheets and whole units in seconds. Boardmarkie is the AI lesson planner that gives teachers their evenings back.",
  keywords: [
    "AI lesson planner",
    "lesson generator",
    "teacher tools",
    "worksheet generator",
    "slides for teachers",
  ],
  openGraph: {
    title: "Boardmarkie — AI Lesson Generator for Teachers",
    description:
      "Create classroom-ready lessons, worksheets and whole units in seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${bricolage.variable} ${caveat.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
