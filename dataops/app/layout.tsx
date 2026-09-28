import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AppProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "DataOps — Your AI Data Analyst Team",
  description:
    "Five specialised AI agents that clean, query, visualise and explain your data. Upload a CSV, ask in plain English, get insights in seconds.",
  keywords: ["data analytics", "AI", "SQL", "data cleaning", "dashboard", "business intelligence", "data analyst"],
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "DataOps — Your AI Data Analyst Team",
    description: "Clean, query, visualise and explain your data with five AI agents.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#04050A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="noise min-h-screen font-sans">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
