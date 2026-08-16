// ============================================
// Landing Page — BlivoAI
// Apple-inspired design: calm, minimal, elegant
// Dark + Light mode with harmonious colors
// Comprehensive sections: Hero, Services,
// Business Deep Dive, Features, Steps, Pricing,
// Demo, FAQ, CTA, Footer
// Mobile-responsive with hamburger menu
// ============================================

"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  MessageSquare, Building2, Bot, Users, BarChart3, Shield,
  Zap, ArrowRight, Check, Star, ChevronDown, ChevronUp,
  Cpu, Briefcase, Headphones, Palette, TrendingUp,
  Globe2, Clock, Eye, Heart, Menu, Brain, Code, DollarSign,
  Sparkles, Crown, Coins, Loader2
} from "lucide-react"

interface LandingPageProps {
  onGetStarted: () => void
  onLogin: () => void
}

// ============================================
// Fade-in on scroll animation wrapper
// ============================================
function FadeInSection({ children, delay = 0, className = "" }: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

// ============================================
// FAQ Item with expand/collapse
// ============================================
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="border-b border-border/50 py-5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group min-h-[44px]"
      >
        <span className="text-foreground font-medium text-base sm:text-lg group-hover:text-brand transition-colors">
          {question}
        </span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground group-hover:text-brand transition-colors" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-brand transition-colors" />
        )}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 mt-4" : "max-h-0"}`}>
        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{answer}</p>
      </div>
    </div>
  )
}

interface PlanFromDB {
  id: string
  planKey: string
  name: string
  nameAr: string
  price: number
  tokenBudget: number
  maxEmployees: number
  maxDepartments: number
  features: string
  featuresEn: string
  isActive: boolean
  order: number
}

const PLAN_ICONS: Record<string, typeof Sparkles> = {
  FREE_TRIAL: Sparkles,
  STARTER: Zap,
  PROFESSIONAL: Building2,
  ENTERPRISE: Crown,
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const language = useLocale()
  const isRTL = language === "ar"
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dbPlans, setDbPlans] = useState<PlanFromDB[]>([])

  // Fetch plans from DB (admin-configured)
  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/plans", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          setDbPlans(data.plans || [])
        }
      } catch { /* silent */ }
    }
    loadPlans()

    // جدّد البيانات لما المستخدم يرجع للتاب
    function onVisibility() {
      if (document.visibilityState === "visible") loadPlans()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  const activeLandingPlans = dbPlans.filter(p => p.isActive)
  const popularLandingIndex = Math.floor(activeLandingPlans.length / 2)

  // Business deep dive features
  const businessFeatures = [
    { icon: Briefcase, titleKey: "landing.business.feature.1.title", descKey: "landing.business.feature.1.desc", slug: "bizSpecializedEmployees" },
    { icon: Cpu, titleKey: "landing.business.feature.2.title", descKey: "landing.business.feature.2.desc", slug: "bizSmartDepartments" },
    { icon: Headphones, titleKey: "landing.business.feature.3.title", descKey: "landing.business.feature.3.desc", slug: "bizDirectConversations" },
    { icon: BarChart3, titleKey: "landing.business.feature.4.title", descKey: "landing.business.feature.4.desc", slug: "bizSmartHRReports" },
    { icon: Globe2, titleKey: "landing.business.feature.5.title", descKey: "landing.business.feature.5.desc", slug: "bizMultiLanguage" },
    { icon: Clock, titleKey: "landing.business.feature.6.title", descKey: "landing.business.feature.6.desc", slug: "bizAvailable247" },
  ]

  // Core features
  const coreFeatures = [
    { icon: Bot, titleKey: "landing.feature.1.title", descKey: "landing.feature.1.desc", slug: "specializedEmployees" },
    { icon: Building2, titleKey: "landing.feature.2.title", descKey: "landing.feature.2.desc", slug: "organizedDepartments" },
    { icon: Zap, titleKey: "landing.feature.3.title", descKey: "landing.feature.3.desc", slug: "freeMode" },
    { icon: Users, titleKey: "landing.feature.4.title", descKey: "landing.feature.4.desc", slug: "smartChats" },
    { icon: TrendingUp, titleKey: "landing.feature.5.title", descKey: "landing.feature.5.desc", slug: "reportsAnalytics" },
    { icon: Shield, titleKey: "landing.feature.6.title", descKey: "landing.feature.6.desc", slug: "advancedSecurity" },
  ]

  // FAQ items
  const faqItems = [
    { qKey: "landing.faq.1.q", aKey: "landing.faq.1.a" },
    { qKey: "landing.faq.2.q", aKey: "landing.faq.2.a" },
    { qKey: "landing.faq.3.q", aKey: "landing.faq.3.a" },
    { qKey: "landing.faq.4.q", aKey: "landing.faq.4.a" },
    { qKey: "landing.faq.5.q", aKey: "landing.faq.5.a" },
    { qKey: "landing.faq.6.q", aKey: "landing.faq.6.a" },
  ]

  // Section IDs for nav links
  const navSections = [
    { id: "services", labelKey: "landing.nav.services" },
    { id: "features", labelKey: "landing.nav.features" },
    { id: "pricing", labelKey: "landing.nav.pricing" },
  ]

  // Blog link — separate from scroll sections
  const blogUrl = `/${language}/blog`

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden" dir="ltr">
      {/* ============================================
          Navigation — Sticky, clean, Apple-like
          Mobile: hamburger + Sheet drawer
          Desktop: inline links
          ============================================ */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-6xl mx-auto">
          <Link href={`/${language}`} className="flex items-center gap-2 sm:gap-3">
            {/* Logo — BlivoAI brand */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-v2.png" alt="BlivoAI Logo" className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg" />
            <span className="font-bold text-lg sm:text-xl tracking-tight text-foreground">BlivoAI</span>
          </Link>

          {/* Desktop nav links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-1">
            {navSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-muted-foreground hover:text-foreground text-sm px-3 py-2 rounded-lg hover:bg-muted transition-all min-h-[44px] flex items-center"
              >
                {t(section.labelKey, language)}
              </a>
            ))}
            <Link
              href={blogUrl}
              className="text-muted-foreground hover:text-foreground text-sm px-3 py-2 rounded-lg hover:bg-muted transition-all min-h-[44px] flex items-center"
            >
              {t("page.blog.title", language)}
            </Link>
            <a
              href={`https://support.blivoai.com?lang=${language}`}
              className="text-muted-foreground hover:text-foreground text-sm px-3 py-2 rounded-lg hover:bg-muted transition-all min-h-[44px] flex items-center"
            >
              {t("landing.nav.help", language)}
            </a>
            <a
              href={language === "ar" ? "/en" : "/ar"}
              className="text-muted-foreground hover:text-foreground text-sm px-3 py-2 rounded-lg hover:bg-muted transition-all min-h-[44px] flex items-center"
            >
              {language === "ar" ? "EN" : "عربي"}
            </a>
            <ThemeToggle />
            <Button
              variant="ghost"
              onClick={onLogin}
              className="text-muted-foreground hover:text-foreground hover:bg-muted min-h-[44px]"
            >
              {t("landing.cta.login", language)}
            </Button>
            <Button
              onClick={onGetStarted}
              className="bg-brand hover:bg-brand-dark text-brand-foreground shadow-sm min-h-[44px]"
            >
              {t("landing.cta.start", language)}
            </Button>
          </div>

          {/* Mobile: hamburger + Sheet drawer */}
          <div className="flex items-center gap-2 md:hidden">
            <a
              href={language === "ar" ? "/en" : "/ar"}
              className="text-muted-foreground hover:text-foreground text-sm px-2 py-1.5 rounded-lg hover:bg-muted transition-all min-h-[44px] flex items-center"
            >
              {language === "ar" ? "EN" : "عربي"}
            </a>
            <ThemeToggle />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-background">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo-v2.png" alt="BlivoAI Logo" className="w-9 h-9 rounded-lg" />
                    <span className="font-bold text-lg tracking-tight text-foreground">BlivoAI</span>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-2 px-4 py-4">
                  {navSections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-foreground hover:text-brand text-base px-4 py-3 rounded-lg hover:bg-muted transition-all min-h-[44px] flex items-center"
                    >
                      {t(section.labelKey, language)}
                    </a>
                  ))}

                  <Link
                    href={blogUrl}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-foreground hover:text-brand text-base px-4 py-3 rounded-lg hover:bg-muted transition-all min-h-[44px] flex items-center"
                  >
                    {t("page.blog.title", language)}
                  </Link>

                  <a
                    href={`https://support.blivoai.com?lang=${language}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-foreground hover:text-brand text-base px-4 py-3 rounded-lg hover:bg-muted transition-all min-h-[44px] flex items-center"
                  >
                    {t("landing.nav.help", language)}
                  </a>

                  <div className="border-t border-border/50 my-3" />

                  <Button
                    variant="ghost"
                    onClick={() => { onLogin(); setMobileMenuOpen(false) }}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted min-h-[44px] justify-start text-base"
                  >
                    {t("landing.cta.login", language)}
                  </Button>

                  <Button
                    onClick={() => { onGetStarted(); setMobileMenuOpen(false) }}
                    className="bg-brand hover:bg-brand-dark text-brand-foreground shadow-sm min-h-[44px] text-base"
                  >
                    {t("landing.cta.start", language)}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* ============================================
          Hero Section — Apple-style, spacious, calm
          Responsive text sizes: mobile → tablet → desktop
          ============================================ */}
      <section className="px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 max-w-4xl mx-auto text-center">
        <FadeInSection>
          <p className="text-brand font-medium text-sm sm:text-base mb-4 sm:mb-6 tracking-wide uppercase">
            {t("app.subtitle", language)}
          </p>
        </FadeInSection>
        <FadeInSection delay={100}>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] sm:leading-[1.1] mb-4 sm:mb-6 tracking-tight">
            {t("landing.hero.title", language)}
            <br />
            <span className="text-brand">
              {t("landing.hero.subtitle", language)}
            </span>
          </h1>
        </FadeInSection>
        <FadeInSection delay={200}>
          <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            {t("landing.hero.description", language)}
          </p>
        </FadeInSection>
        <FadeInSection delay={300}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-brand hover:bg-brand-dark text-brand-foreground text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-12 rounded-xl shadow-sm min-h-[44px] min-w-[44px]"
            >
              {t("landing.cta.start", language)}
              <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 ml-2" />
            </Button>
            <span className="text-muted-foreground/70 text-sm">
              {t("landing.cta.pricingNote", language)}
            </span>
          </div>
        </FadeInSection>
      </section>

      {/* Section separator */}
      <div className="section-separator max-w-xl mx-auto" />

      {/* ============================================
          Two Services Section — Chat + Business
          ============================================ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20" id="services">
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <p className="text-center text-brand font-medium text-sm sm:text-base mb-3 tracking-wide uppercase">
              {t("landing.services.tag", language)}
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-3 sm:mb-4">
              {t("landing.services.title", language)}
            </h2>
            <p className="text-muted-foreground text-center mb-10 sm:mb-14 max-w-xl mx-auto text-sm sm:text-base">
              {t("landing.services.subtitle", language)}
            </p>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {/* Dynamic service cards from DB plans */}
            {dbPlans.filter(p => p.isActive).slice(0, 2).map((plan, idx) => {
              const Icon = PLAN_ICONS[plan.planKey] || Sparkles
              const features: string[] = []
              try { features.push(...JSON.parse(language === "ar" ? plan.features : plan.featuresEn)) } catch {}
              const isSecond = idx === 1
              return (
                <FadeInSection key={plan.id} delay={idx * 100}>
                  <Card className={`rounded-2xl p-5 sm:p-6 md:p-8 ${isSecond ? "border-brand/30" : "border-border/50"} bg-card ${isSecond ? "hover:border-brand/50" : "hover:border-brand/30"} transition-all duration-300 group ${isSecond ? "relative overflow-hidden" : ""}`}>
                    {isSecond && (
                      <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                        <div className="inline-flex items-center gap-1 bg-brand text-brand-foreground rounded-full px-2 sm:px-3 py-1 text-xs font-medium">
                          <Star className="w-3 h-3" />
                          {language === "ar" ? "الأكتر طلباً" : "Most Popular"}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4 sm:mb-5">
                      <div className="w-10 sm:w-12 h-10 sm:h-12 min-w-[44px] min-h-[44px] rounded-xl bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                        <Icon className="w-5 sm:w-6 h-5 sm:h-6 text-brand" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-foreground">{language === "ar" ? plan.nameAr : plan.name}</h3>
                        <p className="text-brand font-semibold text-sm sm:text-base">
                          {plan.price === 0 ? (language === "ar" ? "مجاني" : "Free") : `$${plan.price}`}
                          <span className="text-muted-foreground text-sm">/{language === "ar" ? "شهر" : "mo"}</span>
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-1.5 mb-4 sm:mb-6">
                      {features.slice(0, 3).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {!isSecond && (
                      <div className="inline-flex items-center gap-2 bg-brand/10 rounded-full px-3 py-2 text-brand text-sm sm:text-base font-medium min-h-[44px]">
                        <Star className="w-3.5 h-3.5" />
                        {language === "ar" ? "مميز" : "Featured"}
                      </div>
                    )}
                    {isSecond && (
                      <div className="flex items-center gap-2 text-brand">
                        <ArrowRight className="w-4 h-4" />
                        <span className="text-sm font-medium">{language === "ar" ? "ابدأ الآن" : "Get Started"}</span>
                      </div>
                    )}
                  </Card>
                </FadeInSection>
              )
            })}
            {dbPlans.length === 0 && (
              <>
                <FadeInSection delay={100}><div className="flex items-center justify-center py-8 col-span-2"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div></FadeInSection>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Section separator */}
      <div className="section-separator max-w-xl mx-auto" />

      {/* ============================================
          Employee Focus — How AI Employees Work
          Detailed explanation with specializations and benefits
          ============================================ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-14">
              <p className="text-brand font-medium text-sm sm:text-base mb-3 tracking-wide uppercase">
                {language === "ar" ? "موظفين AI متخصصين" : "Specialized AI Employees"}
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
                {t("landing.employee.focusTitle", language)}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-lg leading-relaxed">
                {t("landing.employee.focusDesc", language)}
              </p>
            </div>
          </FadeInSection>

          {/* How it works — 4 steps */}
          <FadeInSection>
            <div className="text-center mb-8">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                {t("landing.employee.howItWorks.title", language)}
              </h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((step, i) => (
                <FadeInSection key={step} delay={i * 100}>
                  <Card className="rounded-2xl p-4 sm:p-5 border-border/50 bg-card text-center group hover:border-brand/30 transition-all">
                    <div className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-brand/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-brand/20 transition-colors">
                      <span className="text-brand font-bold text-lg">{step}</span>
                    </div>
                    <p className="text-foreground text-sm sm:text-base font-medium leading-relaxed">
                      {t(`landing.employee.howItWorks.step${step}`, language)}
                    </p>
                  </Card>
                </FadeInSection>
              ))}
            </div>
          </FadeInSection>

          {/* Specializations grid */}
          <FadeInSection>
            <div className="mt-8 sm:mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: "accountant", icon: DollarSign },
                { key: "programmer", icon: Code },
                { key: "socialManager", icon: Globe2 },
                { key: "hrManager", icon: Users },
                { key: "marketer", icon: TrendingUp },
                { key: "customerService", icon: Headphones },
              ].map((spec, i) => (
                <FadeInSection key={spec.key} delay={i * 80}>
                  <div onClick={onGetStarted} className="block cursor-pointer">
                    <Card className="rounded-2xl p-4 sm:p-5 border-border/50 bg-card hover:border-brand/30 transition-all group cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                          <spec.icon className="w-5 h-5 text-brand" />
                        </div>
                        <p className="text-foreground text-sm sm:text-base font-semibold leading-snug">
                          {(() => {
                            const roleNames: Record<string, Record<string, string>> = {
                              accountant: { ar: "محاسب", en: "Accountant" },
                              programmer: { ar: "مبرمج", en: "Programmer" },
                              socialManager: { ar: "مدير سوشال", en: "Social Media Mgr" },
                              hrManager: { ar: "مدير HR", en: "HR Manager" },
                              marketer: { ar: "مسؤول تسويق", en: "Marketer" },
                              customerService: { ar: "خدمة زبائن", en: "Customer Service" },
                            }
                            return roleNames[spec.key]?.[language] || spec.key
                          })()}
                        </p>
                      </div>
                      <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                        {t(`landing.employee.specialization.${spec.key}`, language)}
                      </p>
                    </Card>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </FadeInSection>

          {/* Benefits — why AI employees are better */}
          <FadeInSection>
            <div className="mt-8 sm:mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[
                { key: "noHiring", icon: Zap },
                { key: "noSalary", icon: DollarSign },
                { key: "noErrors", icon: Shield },
                { key: "247", icon: Clock },
                { key: "learns", icon: Brain },
              ].map((benefit, i) => (
                <FadeInSection key={benefit.key} delay={i * 80}>
                  <div onClick={onGetStarted} className="cursor-pointer">
                    <div className="rounded-xl p-4 sm:p-5 border border-brand/20 bg-brand/5 text-center min-h-[44px] hover:border-brand/40 transition-all cursor-pointer">
                      <benefit.icon className="w-5 h-5 text-brand mx-auto mb-2" />
                      <p className="text-foreground text-sm sm:text-base font-medium leading-relaxed">
                        {t(`landing.employee.benefit.${benefit.key}`, language)}
                      </p>
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Section separator */}
      <div className="section-separator max-w-xl mx-auto" />

      {/* ============================================
          Business Deep Dive — What is BlivoAI Business?
          Detailed explanation with feature cards
          ============================================ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-14">
              <p className="text-brand font-medium text-sm sm:text-base mb-3 tracking-wide uppercase">
                {t("landing.business.tag", language)}
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
                {t("landing.business.title", language)}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-lg leading-relaxed mb-4 sm:mb-8">
                {t("landing.business.desc", language)}
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                {t("landing.business.desc2", language)}
              </p>
            </div>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {businessFeatures.map((feature, i) => (
              <FadeInSection key={feature.titleKey} delay={i * 100}>
                <div onClick={onGetStarted} className="block cursor-pointer">
                  <Card className="rounded-2xl p-5 sm:p-6 border-border/50 bg-card hover:border-brand/30 transition-all duration-300 group text-center cursor-pointer">
                    <div className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg bg-brand/10 flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:bg-brand/20 transition-colors">
                      <feature.icon className="w-5 h-5 text-brand" />
                    </div>
                    <h3 className="text-foreground font-semibold text-base sm:text-lg mb-1.5 sm:mb-2">{t(feature.titleKey, language)}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{t(feature.descKey, language)}</p>
                  </Card>
                </div>
              </FadeInSection>
            ))}
          </div>

          {/* Key benefit highlight */}
          <FadeInSection delay={400}>
            <div className="mt-8 sm:mt-12 text-center">
              <Card className="rounded-2xl p-5 sm:p-6 md:p-8 border-brand/20 bg-card inline-block max-w-2xl">
                <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <Eye className="w-4 sm:w-5 h-4 sm:h-5 text-brand" />
                  <h3 className="text-base sm:text-lg font-bold text-foreground">{t("landing.business.highlight.title", language)}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                  {t("landing.business.highlight.desc", language)}
                </p>
              </Card>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Section separator */}
      <div className="section-separator max-w-xl mx-auto" />

      {/* ============================================
          Features Section
          ============================================ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20" id="features">
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <p className="text-center text-brand font-medium text-sm sm:text-base mb-3 tracking-wide uppercase">
              {t("landing.features.tag", language)}
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-3 sm:mb-4">
              {t("landing.features.title", language)}
            </h2>
            <p className="text-muted-foreground text-center mb-10 sm:mb-14 max-w-xl mx-auto text-sm sm:text-base">
              {t("landing.features.subtitle", language)}
            </p>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {coreFeatures.map((feature, i) => (
              <FadeInSection key={feature.titleKey} delay={i * 80}>
                <div onClick={onGetStarted} className="block cursor-pointer">
                  <Card className="rounded-2xl p-5 sm:p-6 border-border/50 bg-card hover:border-brand/30 transition-all duration-300 group text-center cursor-pointer">
                    <div className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg bg-brand/10 flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:bg-brand/20 transition-colors">
                      <feature.icon className="w-5 h-5 text-brand" />
                    </div>
                    <h3 className="text-foreground font-semibold text-base sm:text-lg mb-1.5 sm:mb-2">{t(feature.titleKey, language)}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{t(feature.descKey, language)}</p>
                  </Card>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Section separator */}
      <div className="section-separator max-w-xl mx-auto" />

      {/* ============================================
          How It Works — 3 Steps
          ============================================ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <FadeInSection>
            <p className="text-center text-brand font-medium text-sm sm:text-base mb-3 tracking-wide uppercase">
              {t("landing.steps.tag", language)}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 sm:mb-4">{t("landing.steps.title", language)}</h2>
            <p className="text-muted-foreground text-center mb-10 sm:mb-14 text-sm sm:text-base">{t("landing.steps.subtitle", language)}</p>
          </FadeInSection>

          <div className="space-y-8 sm:space-y-12">
            {[
              { num: "1", titleKey: "landing.step.1.title", descKey: "landing.step.1.desc" },
              { num: "2", titleKey: "landing.step.2.title", descKey: "landing.step.2.desc" },
              { num: "3", titleKey: "landing.step.3.title", descKey: "landing.step.3.desc" },
            ].map((step, i) => (
              <FadeInSection key={step.num} delay={i * 150}>
                <div className="flex gap-4 sm:gap-6 items-start">
                  <div className="flex-shrink-0 w-10 sm:w-14 h-10 sm:h-14 min-w-[44px] min-h-[44px] rounded-xl sm:rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                    <span className="text-brand text-base sm:text-xl font-bold">{step.num}</span>
                  </div>
                  <div className="flex-1 pt-1 sm:pt-2">
                    <h3 className="text-foreground font-semibold text-lg sm:text-xl mb-1.5 sm:mb-2">{t(step.titleKey, language)}</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{t(step.descKey, language)}</p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Section separator */}
      <div className="section-separator max-w-xl mx-auto" />

      {/* ============================================
          Pricing Section
          ============================================ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20" id="pricing">
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <p className="text-center text-brand font-medium text-sm sm:text-base mb-3 tracking-wide uppercase">
              {t("landing.pricing.tag", language)}
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-3 sm:mb-4">{t("landing.pricing.title", language)}</h2>
            <p className="text-muted-foreground text-center mb-10 sm:mb-14 max-w-xl mx-auto text-sm sm:text-base">{t("landing.pricing.subtitle", language)}</p>
          </FadeInSection>
          
          {/* Dynamic pricing cards from DB */}
          <div className={`grid gap-4 sm:gap-6 ${activeLandingPlans.length <= 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-" + activeLandingPlans.length : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
            {activeLandingPlans.map((plan, idx) => {
              const Icon = PLAN_ICONS[plan.planKey] || Sparkles
              const isPopular = idx === popularLandingIndex
              const features: string[] = []
              try { features.push(...JSON.parse(language === "ar" ? plan.features : plan.featuresEn)) } catch {}
              return (
                <FadeInSection key={plan.id} delay={idx * 100}>
                  <Card className={`rounded-2xl p-5 sm:p-6 md:p-8 ${isPopular ? "border-brand/30" : "border-border/50"} bg-card ${isPopular ? "hover:border-brand/50" : "hover:border-brand/30"} transition-all duration-300 ${isPopular ? "relative overflow-hidden" : ""}`}>
                    {isPopular && (
                      <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                        <div className="inline-flex items-center gap-1 bg-brand text-brand-foreground rounded-full px-2 sm:px-3 py-1 text-xs font-medium">
                          <Star className="w-3 h-3" />
                          {language === "ar" ? "الأكتر طلباً" : "Most Popular"}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <Icon className="w-5 h-5 text-brand" />
                      <h3 className="font-semibold text-lg sm:text-xl text-foreground">{language === "ar" ? plan.nameAr : plan.name}</h3>
                    </div>
                    <div className="mb-4 sm:mb-6">
                      <span className={`text-2xl sm:text-4xl font-bold ${isPopular ? "text-brand" : "text-foreground"}`}>
                        {plan.price === 0 ? (language === "ar" ? "مجاني" : "Free") : `$${plan.price}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-muted-foreground text-sm">/{language === "ar" ? "شهر" : "mo"}</span>
                      )}
                    </div>
                    <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                      {features.slice(0, 5).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-brand" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={onGetStarted}
                      className={`w-full ${isPopular ? "bg-brand hover:bg-brand-dark text-brand-foreground shadow-sm" : "bg-muted text-foreground hover:bg-brand/10 border border-border/50 hover:border-brand/30"} transition-all min-h-[44px]`}
                    >
                      {language === "ar" ? "ابدأ الآن" : "Get Started"}
                    </Button>
                  </Card>
                </FadeInSection>
              )
            })}
            {dbPlans.length === 0 && (
              <div className="col-span-full flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-brand" />
              </div>
            )}
          </div>
          {/* Link to full pricing page */}
          <div className="text-center mt-6 sm:mt-8">
            <Link
              href={`/${language}/pricing`}
              className="inline-flex items-center gap-2 text-brand hover:underline text-sm font-medium min-h-[44px]"
            >
              {language === "ar" ? "عرض جميع الخطط" : "View All Plans"}
              <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
            </Link>
          </div>
        </div>
      </section>

      {/* Section separator */}
      <div className="section-separator max-w-xl mx-auto" />

      {/* ============================================
          Demo Section — Chat preview
          ============================================ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-muted/30">
        <div className="max-w-2xl mx-auto">
          <FadeInSection>
            <p className="text-center text-brand font-medium text-sm sm:text-base mb-3 tracking-wide uppercase">
              {t("landing.demo.tag", language)}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 sm:mb-4">{t("landing.demo.title", language)}</h2>
            <p className="text-muted-foreground text-center mb-8 sm:mb-10 text-sm sm:text-base">{t("landing.demo.subtitle", language)}</p>
          </FadeInSection>

          <FadeInSection delay={200}>
            <Card className="rounded-2xl p-4 sm:p-6 border-brand/20 bg-card">
              <div className="space-y-3 sm:space-y-4">
                {/* User message */}
                <div className="flex justify-start">
                  <div className="bg-brand text-brand-foreground rounded-2xl rounded-bl-sm px-3 sm:px-4 py-3 sm:py-3 max-w-[85%] sm:max-w-[80%] shadow-sm min-h-[44px]">
                    <p className="text-sm sm:text-base">{t("landing.demo.msg1", language)}</p>
                  </div>
                </div>
                {/* Employee response */}
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-br-sm px-3 sm:px-4 py-3 sm:py-3 max-w-[85%] sm:max-w-[80%] min-h-[44px]">
                    <p className="text-brand text-sm font-medium mb-1">{t("landing.demo.empName", language)}</p>
                    <p className="text-foreground text-sm sm:text-base leading-relaxed">{t("landing.demo.msg2", language)}</p>
                  </div>
                </div>
                {/* User follow up */}
                <div className="flex justify-start">
                  <div className="bg-brand text-brand-foreground rounded-2xl rounded-bl-sm px-3 sm:px-4 py-3 sm:py-3 max-w-[85%] sm:max-w-[80%] shadow-sm min-h-[44px]">
                    <p className="text-sm sm:text-base">{t("landing.demo.msg3", language)}</p>
                  </div>
                </div>
                {/* Employee final response */}
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-br-sm px-3 sm:px-4 py-3 sm:py-3 max-w-[85%] sm:max-w-[80%] min-h-[44px]">
                    <p className="text-brand text-sm font-medium mb-1">{t("landing.demo.empName", language)}</p>
                    <p className="text-foreground text-sm sm:text-base leading-relaxed">{t("landing.demo.msg4", language)}</p>
                  </div>
                </div>
              </div>
            </Card>
          </FadeInSection>
        </div>
      </section>

      {/* Section separator */}
      <div className="section-separator max-w-xl mx-auto" />

      {/* ============================================
          FAQ Section
          ============================================ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20" id="faq">
        <div className="max-w-3xl mx-auto">
          <FadeInSection>
            <p className="text-center text-brand font-medium text-sm sm:text-base mb-3 tracking-wide uppercase">
              {t("landing.faq.tag", language)}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 sm:mb-4">{t("landing.faq.title", language)}</h2>
            <p className="text-muted-foreground text-center mb-8 sm:mb-10 text-sm sm:text-base">{t("landing.faq.subtitle", language)}</p>
          </FadeInSection>

          <FadeInSection delay={100}>
            <div>
              {faqItems.map((item) => (
                <FAQItem
                  key={item.qKey}
                  question={t(item.qKey, language)}
                  answer={t(item.aKey, language)}
                />
              ))}
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Section separator */}
      <div className="section-separator max-w-xl mx-auto" />

      {/* ============================================
          CTA Section
          ============================================ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-muted/30">
        <div className="max-w-2xl mx-auto text-center">
          <FadeInSection>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">{t("landing.cta.readyTitle", language)}</h2>
            <p className="text-muted-foreground mb-8 sm:mb-10 text-base sm:text-lg">{t("landing.cta.readyDesc", language)}</p>
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-brand hover:bg-brand-dark text-brand-foreground text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-12 rounded-xl shadow-sm min-h-[44px] min-w-[44px]"
            >
              {t("landing.cta.start", language)}
              <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 ml-2" />
            </Button>
          </FadeInSection>
        </div>
      </section>

      {/* ============================================
          Footer — Professional, comprehensive
          ============================================ */}
      <footer className="border-t border-border/50 bg-background mt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Main footer grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 py-8 sm:py-12">
            {/* Brand column */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-v2.png" alt="BlivoAI Logo" className="w-9 h-9 rounded-lg" />
                <span className="font-bold text-lg tracking-tight text-foreground">BlivoAI</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {language === "ar"
                  ? "منصة ذكاء اصطناعي متخصصة للأعمال العربية — موظفون AI، شات بوت ذكي، وإدارة أعمال شاملة."
                  : "Specialized AI platform for businesses — AI employees, smart chatbot, and complete business management."
                }
              </p>
              <div className="flex gap-3">
                <a href="https://x.com/blivoai" target="_blank" rel="noopener" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-brand/10 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-muted-foreground hover:fill-brand"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://www.linkedin.com/company/blivoai" target="_blank" rel="noopener" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-brand/10 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-muted-foreground hover:fill-brand"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://github.com/sylojor/blivoai" target="_blank" rel="noopener" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-brand/10 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-muted-foreground hover:fill-brand"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.97.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.919.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="https://www.fiverr.com/blivoai" target="_blank" rel="noopener" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-brand/10 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-muted-foreground hover:fill-brand"><path d="M23.004 15.588a.995.995 0 1 0 0-1.99.995.995 0 0 0 0 1.99zm-.996-3.705h-.85c-.546 0-.84.41-.84 1.082v1.578h1.688v1.672h-1.688v5.285h-1.688v-5.285h-1.06v-1.672h1.06v-.094c0-2.217.797-3.289 2.766-3.289h1.612v1.723zm-4.629 1.723v5.285h-1.688v-5.285h-1.06v-1.672h1.06v-3.375h1.688v3.375h1.688v1.672h-1.688zM5.163 17.5c-.648 0-1.145-.5-1.145-1.125s.496-1.125 1.145-1.125c.648 0 1.144.5 1.144 1.125S5.811 17.5 5.163 17.5zm-1.145-5.617h-.024V9.5H2.31v9.836c0 1.594 1.296 2.891 2.891 2.891h2.852v-1.672H5.201c-.648 0-1.145-.496-1.145-1.14V11.883zm5.665 3.492c0-1.594 1.296-2.891 2.891-2.891 1.594 0 2.89 1.297 2.89 2.89v.25H10.64c.13.84.844 1.48 1.734 1.48.52 0 1.02-.25 1.34-.664l1.367.91c-.664.953-1.668 1.477-2.754 1.477-1.648 0-2.648-1.246-2.648-2.852zm4.074-.617a1.385 1.385 0 0 0-1.238-.754c-.553 0-1.004.31-1.18.754h2.418zM11.287 7.5c0 .414-.336.75-.75.75H9.225c-.414 0-.75-.336-.75-.75s.336-.75.75-.75h1.312c.414 0 .75.336.75.75z"/></svg>
                </a>
              </div>
            </div>

            {/* Product column */}
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-3">
                {language === "ar" ? "المنتج" : "Product"}
              </h3>
              <ul className="space-y-2.5">
                <li><Link href={`/${language}/blog`} className="text-muted-foreground text-sm hover:text-foreground transition-colors">{language === "ar" ? "المدونة" : "Blog"}</Link></li>
                <li><Link href={`/${language}/pricing`} className="text-muted-foreground text-sm hover:text-foreground transition-colors">{language === "ar" ? "الأسعار" : "Pricing"}</Link></li>
                <li><Link href={`/${language}/api-docs`} className="text-muted-foreground text-sm hover:text-foreground transition-colors">API Docs</Link></li>
                <li><Link href={`/${language}/download`} className="text-muted-foreground text-sm hover:text-foreground transition-colors">{language === "ar" ? "تحميل" : "Download"}</Link></li>
                <li><a href={`https://support.blivoai.com?lang=${language}`} className="text-muted-foreground text-sm hover:text-foreground transition-colors">{language === "ar" ? "مركز الدعم" : "Support Center"}</a></li>
              </ul>
            </div>

            {/* Company column */}
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-3">
                {language === "ar" ? "الشركة" : "Company"}
              </h3>
              <ul className="space-y-2.5">
                <li><Link href={`/${language}/about`} className="text-muted-foreground text-sm hover:text-foreground transition-colors">{language === "ar" ? "عن BlivoAI" : "About"}</Link></li>
                <li><Link href={`/${language}/feature/noHiring`} className="text-muted-foreground text-sm hover:text-foreground transition-colors">{language === "ar" ? "الميزات" : "Features"}</Link></li>
                <li><Link href={`/${language}/blog`} className="text-muted-foreground text-sm hover:text-foreground transition-colors">{language === "ar" ? "المدونة" : "Blog"}</Link></li>
                <li><Link href={`/${language}/feature/247`} className="text-muted-foreground text-sm hover:text-foreground transition-colors">{language === "ar" ? "24/7" : "24/7"}</Link></li>
              </ul>
            </div>

            {/* Legal column */}
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-3">
                {language === "ar" ? "قانوني" : "Legal"}
              </h3>
              <ul className="space-y-2.5">
                <li><Link href={`/${language}/privacy`} className="text-muted-foreground text-sm hover:text-foreground transition-colors">{t("landing.footer.privacy", language)}</Link></li>
                <li><Link href={`/${language}/terms`} className="text-muted-foreground text-sm hover:text-foreground transition-colors">{t("landing.footer.terms", language)}</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border/50 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              &copy; 2026 BlivoAI &mdash; {t("landing.footer.rights", language)}
            </p>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <span>{language === "ar" ? "صنع بـ ❤️ للأعمال العربية" : "Made with ❤️ for businesses"}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
