
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Briefly — Your personal newspaper",
  description:
    "A lightweight, AI-curated news reader for India and the world.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
