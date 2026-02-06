import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import Background from "@/components/Background";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className='h-full'
    >
      <head>
        <link
          rel='icon'
          href='/favicon.svg'
          type='image/svg+xml'
        ></link>
        <link
          rel='apple-touch-icon'
          href='/favicon.svg'
        ></link>
        <link
          rel='manifest'
          href='/site.webmanifest'
        ></link>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen relative flex flex-col`}
      >
        <Background />

        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <div className='flex-1 flex flex-col'>{children}</div>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
