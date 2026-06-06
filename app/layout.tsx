import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CleanDesk — Your Intelligent Workspace",
  description: "An AI-powered intelligent workspace to turn mental clutter into organized action.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
