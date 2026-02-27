import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avaliação Clínica Estrutural",
  description: "Sistema interno – avaliação clínica e estrutural durante consulta médica.",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-slate-800 focus:px-4 focus:py-2 focus:text-white">
          Pular para o conteúdo
        </a>
        <div id="main" role="main">
          {children}
        </div>
      </body>
    </html>
  );
}
