"use client"

import { use } from "react"
import { t } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import { PublicPageLayout } from "@/components/public/public-page-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Download, Smartphone, Globe, Code2, Terminal } from "lucide-react"

export function DownloadContent({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: langStr } = use(params)
  const lang = langStr as Locale

  const downloads = [
    {
      icon: <Smartphone className="w-6 h-6 text-brand" />,
      title: lang === "ar" ? "تطبيق الجوال" : "Mobile App",
      desc: lang === "ar" ? "حمل تطبيق BlivoAI على جوالك — iOS وAndroid. إدارة أعمالك من أي مكان." : "Get BlivoAI on your phone — iOS and Android. Manage your business from anywhere.",
      badge: lang === "ar" ? "قريباً" : "Coming Soon",
    },
    {
      icon: <Globe className="w-6 h-6 text-brand" />,
      title: lang === "ar" ? "النسخة الويب" : "Web App",
      desc: lang === "ar" ? "استخدم BlivoAI مباشرة من المتصفح — لا حاجة لتحميل. متوفر الآن على demo.blivoai.com." : "Use BlivoAI directly from the browser — no download needed. Available now at demo.blivoai.com.",
      badge: lang === "ar" ? "متوفر" : "Available",
    },
    {
      icon: <Code2 className="w-6 h-6 text-brand" />,
      title: lang === "ar" ? "SDK — JavaScript/Node" : "SDK — JavaScript/Node",
      desc: lang === "ar" ? "دمج BlivoAI في تطبيقك باستخدام SDK. واجهة API بسيطة للشات بوت والموظفين AI." : "Integrate BlivoAI into your app with the SDK. Simple API for chatbot and AI employees.",
      badge: lang === "ar" ? "قريباً" : "Coming Soon",
    },
    {
      icon: <Terminal className="w-6 h-6 text-brand" />,
      title: lang === "ar" ? "CLI — سطر الأوامر" : "CLI — Command Line",
      desc: lang === "ar" ? "أدوات سطر الأوامر للمطورين — إنشاء موظفين AI، إدارة مشاريع، وتشغيل أوامر من Terminal." : "Command line tools for developers — create AI employees, manage projects, run commands from Terminal.",
      badge: lang === "ar" ? "قريباً" : "Coming Soon",
    },
  ]

  return (
    <PublicPageLayout params={params}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center py-8 sm:py-12">
          <div className="w-16 h-16 rounded-xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8 text-brand" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {lang === "ar" ? "تحميل BlivoAI" : "Download BlivoAI"}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            {lang === "ar"
              ? "احصل على BlivoAI على أي منصة — جوال، ويب، أو SDK للمطورين"
              : "Get BlivoAI on any platform — mobile, web, or SDK for developers"
            }
          </p>
        </div>

        {/* Download cards */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 pb-8">
          {downloads.map((item, i) => (
            <Card key={i} className="border-border/50 hover:border-brand/30 transition-all">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <h2 className="font-semibold text-lg text-foreground">{item.title}</h2>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    item.badge === (lang === "ar" ? "متوفر" : "Available")
                      ? "bg-brand/10 text-brand"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {item.badge}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PublicPageLayout>
  )
}
