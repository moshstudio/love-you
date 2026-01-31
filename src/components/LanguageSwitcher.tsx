"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useTransition } from "react";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggleLanguage = () => {
    const nextLocale = locale === "en" ? "zh" : "en";
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <button
      onClick={toggleLanguage}
      disabled={isPending}
      className={`px-3 py-1 border border-cyan-500/30 text-cyan-400 text-xs font-mono hover:bg-cyan-500/10 transition-colors ${
        isPending ? "opacity-50 cursor-wait" : ""
      }`}
    >
      [{locale === "en" ? "CN" : "EN"}]
    </button>
  );
}
