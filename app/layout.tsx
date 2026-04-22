import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = "https://npm-unused-detector.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NPM Unused Detector",
    template: "%s | NPM Unused Detector",
  },
  description:
    "Scan package.json against your real imports and remove dead dependencies fast. Upload a project or paste a GitHub URL.",
  keywords: [
    "unused npm dependencies",
    "package.json analyzer",
    "dependency cleanup",
    "nextjs devtools",
    "javascript ast",
  ],
  openGraph: {
    title: "NPM Unused Detector",
    description:
      "Find unused dependencies in minutes with AST-accurate scanning and a clear removal plan.",
    url: siteUrl,
    siteName: "NPM Unused Detector",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NPM Unused Detector",
    description:
      "Upload your project or paste a GitHub repo and get a dependency cleanup report instantly.",
  },
  robots: {
    index: true,
    follow: true,
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
      className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
