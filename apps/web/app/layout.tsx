import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner"; // 🔥 Essential for Global Alerts

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TriaGen | Enterprise Incident Command",
  description:
    "Real-Time Incident Management System powered by WebSocket & BullMQ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      {/* 🔥 Senior Design: 
        - force 'dark' mode class
        - set background to black to prevent white flash on load 
      */}
      <body className={`${inter.className} bg-black text-zinc-100 antialiased`}>
        {children}

        {/* 🔥 The Toast Outlet:
          This listens for toast() calls from anywhere in the app.
          'richColors' makes success/error states pop visually.
        */}
        <Toaster position="top-right" theme="dark" richColors closeButton />
      </body>
    </html>
  );
}
