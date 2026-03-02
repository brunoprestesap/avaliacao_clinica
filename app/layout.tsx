import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { getSession } from "./auth";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "./components/LogoutButton";
import { Providers } from "./providers";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Avaliação Clínica Estrutural",
  description: "Sistema interno – avaliação clínica e estrutural durante consulta médica.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await getSession();
  return (
    <html lang="pt-BR" className={jakarta.variable}>
      <body className="antialiased font-sans">
        <Providers>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
        >
          Pular para o conteúdo
        </a>
        {user && (
          <header className="border-b border-border/80 bg-card/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="content-width-narrow mx-auto flex h-14 items-center justify-between px-4">
              <span className="text-sm text-muted-foreground truncate max-w-[140px] min-[360px]:max-w-[200px] sm:max-w-xs md:max-w-sm" title={user.email}>
                {user.email}
              </span>
              <div className="flex items-center gap-1">
                <Button asChild variant="ghost" size="sm" className="min-h-10 text-muted-foreground hover:text-foreground">
                  <a href="/configuracoes">Configurações</a>
                </Button>
                <LogoutButton />
              </div>
            </div>
          </header>
        )}
        <div id="main" role="main">
          {children}
        </div>
        <Toaster />
        </Providers>
      </body>
    </html>
  );
}
