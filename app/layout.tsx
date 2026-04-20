import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NPM Unused Detector",
  description:
    "Scan package.json against your source imports, find removable dependencies, and estimate package weight savings in seconds.",
  metadataBase: new URL("https://npm-unused-detector.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NPM Unused Detector",
    description:
      "Paste a GitHub URL or upload package.json + src to instantly find unused npm dependencies.",
    url: "https://npm-unused-detector.com",
    siteName: "NPM Unused Detector",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NPM Unused Detector",
    description:
      "Fast, visual dependency cleanup for solo developers shipping Node apps.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-[#0d1117] text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
