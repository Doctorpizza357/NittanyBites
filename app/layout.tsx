import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "NittanyBites · Penn State Dining Analytics",
  description:
    "Track, rate, and analyze Penn State dining hall meals with Firebase-backed sync.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans antialiased">
        <ToastProvider>
          <AuthProvider>
            <AuthGate>{children}</AuthGate>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
