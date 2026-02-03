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
      className={`px-4 py-1.5 bg-rose-50 text-rose-500 text-[10px] font-black tracking-widest rounded-full hover:bg-rose-100 transition-all uppercase ${
        isPending ? "opacity-50 cursor-wait" : ""
      }`}
    >
      {locale === "en" ? "中文" : "EN"}
    </button>
  );
}
