import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/shared/Sidebar";
import { LanguageProvider } from "@/providers/LanguageContext";
import SWRegister from "@/components/shared/SWRegister";
import PWAPrompt from "@/components/shared/PWAPrompt";

export const metadata: Metadata = {
  title: "Editja Template Lab",
  description: "Ferramenta interna de gestão de templates Editja",
  manifest: "/manifest.json",
  other: { "theme-color": "#27A300" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className="font-sans bg-[#ECFFEB]/30">
        <LanguageProvider>
          <SWRegister />
          <PWAPrompt />
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto h-screen">
              {children}
            </main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
