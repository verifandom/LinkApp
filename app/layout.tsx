import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Animated Halftone Cloud Background",
  description: "Beautiful animated halftone cloud background with liquid glass overlay",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
