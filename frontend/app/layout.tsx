import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { ModeProvider } from '@/lib/mode-context';

export const metadata: Metadata = {
  title: 'TASF B2B - Gestion Logistica de Equipaje',
  description: 'Sistema de enrutamiento optimo de equipaje entre aeropuertos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <ModeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
        </ModeProvider>
      </body>
    </html>
  );
}