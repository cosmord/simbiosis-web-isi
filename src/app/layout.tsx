import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Simbiosis · Recetas para la comunidad EII",
  description:
    "Comunidad colaborativa de recetas adaptadas, foro de apoyo y consejos de profesionales para personas que viven con Enfermedad Inflamatoria Intestinal (EII).",
  keywords: [
    "Simbiosis",
    "EII",
    "Enfermedad Inflamatoria Intestinal",
    "Crohn",
    "Colitis ulcerosa",
    "recetas adaptadas",
    "dieta baja en residuos",
  ],
  authors: [{ name: "Proyecto Simbiosis · Ingeniería del Software I" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Simbiosis · Recetas para la comunidad EII",
    description:
      "Recetas adaptadas, foro y consejos de profesionales para vivir mejor con EII.",
    siteName: "Simbiosis",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#131b18" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster richColors position="top-center" closeButton />
      </body>
    </html>
  );
}
