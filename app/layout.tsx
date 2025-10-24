import type { Metadata } from "next";
import "./globals.css";
import { minikitConfig } from "@/minikit.config";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: minikitConfig.miniapp.ogTitle || minikitConfig.miniapp.name,
  description: minikitConfig.miniapp.ogDescription || minikitConfig.miniapp.description,
  openGraph: {
    title: minikitConfig.miniapp.ogTitle || minikitConfig.miniapp.name,
    description: minikitConfig.miniapp.ogDescription || minikitConfig.miniapp.description,
    images: [minikitConfig.miniapp.ogImageUrl],
  },
  twitter: {
    card: 'summary_large_image',
    title: minikitConfig.miniapp.ogTitle || minikitConfig.miniapp.name,
    description: minikitConfig.miniapp.ogDescription || minikitConfig.miniapp.description,
    images: [minikitConfig.miniapp.ogImageUrl],
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: minikitConfig.miniapp.version,
      imageUrl: minikitConfig.miniapp.heroImageUrl,
      launchButton: {
        text: 'Launch Link',
        backgroundColor: '#000000'
      }
    })
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
