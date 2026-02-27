import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avaliação Clínica Estrutural",
  description: "Sistema interno – avaliação clínica e estrutural durante consulta médica.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-[var(--btn-primary-text)] focus:outline-none"
        >
          Pular para o conteúdo
        </a>
        <div id="main" role="main">
          {children}
        </div>
      </body>
    </html>
  );
}
