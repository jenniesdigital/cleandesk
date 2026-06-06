import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthHandler } from "@/components/auth-handler";

export const metadata: Metadata = {
  title: "CleanDesk — Your Intelligent Workspace",
  description: "An AI-powered intelligent workspace to turn mental clutter into organized action.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">
        <AuthHandler />
        {children}
      </body>
    </html>
  );
}
