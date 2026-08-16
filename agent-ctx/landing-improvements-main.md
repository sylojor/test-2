# Landing Page Improvements — BlivoAI

## Task ID: landing-improvements
## Agent: main

## Summary of Changes

### 1. Content Focus — "Hire AI Employees" Narrative

**i18n translations (both Arabic and English):**

- **Hero Section:**
  - AR: `landing.hero.title` → "وظّف موظفين AI", `landing.hero.subtitle` → "لفريق شغلك", `landing.hero.description` → full employee-focused explanation mentioning accountant, programmer, marketing manager, dashboard interaction
  - EN: `landing.hero.title` → "Hire AI Employees", `landing.hero.subtitle` → "For Your Team", `landing.hero.description` → full employee-focused explanation
  - `app.subtitle` → "Hire AI Employees for Your Company" / "وظّف موظفين AI لشركتك"

- **Services Section:**
  - Tag: "AI Employees" / "موظفين AI"
  - Title: "Your AI Team, Ready to Work" / "فريقك AI، جاهز يشتغل"
  - Business card title: "Business — AI Employees" / "إدارة أعمال — موظفين AI"
  - Business card description: explicitly lists accountant, programmer, HR manager, marketing lead roles

- **Business Deep Dive:**
  - Tag: "Your AI Workforce" / "فريقك AI"
  - Title: "Your Company Has an AI Team" / "شركةك عندها فريق AI"
  - Description: emphasizes dashboard interaction, assigning tasks, requesting reports

- **CTA Section:**
  - Title: "Hire Your AI Team Now" / "وظّف فريقك AI الآن"
  - Description: "Employees who work 24/7, understand your company, and respond professionally — no monthly salary or hiring hassle"

### 2. Mobile Responsiveness Fixes

**Landing page component (landing-page.tsx):**

- **Overflow prevention:** Added `overflow-x-hidden` to root `<div>`
- **Text size bumps (mobile readability):**
  - All section tags from `text-xs sm:text-sm` → `text-sm sm:text-base`
  - Hero subtitle tag from `text-xs sm:text-sm` → `text-sm sm:text-base`
  - Hero title from `text-2xl` → `text-3xl` for smallest screens
  - Pricing feature list items from `text-xs sm:text-sm` → `text-sm`
  - Pricing period labels from `text-xs sm:text-sm` → `text-sm`
  - Service price period from `text-xs sm:text-sm` → `text-sm`
  - Service badge from `text-xs sm:text-sm` → `text-sm sm:text-base` + `min-h-[44px]`
  - Demo chat messages from `text-xs sm:text-sm` → `text-sm sm:text-base`
  - Demo employee name from `text-xs` → `text-sm`
  - FAQ tag from `text-xs sm:text-sm` → `text-sm sm:text-base`
  - Footer text from `text-xs sm:text-sm` → `text-sm sm:text-base`
  - Footer links from `text-xs sm:text-sm` → `text-sm sm:text-base`
  - Steps tag from `text-xs sm:text-sm` → `text-sm sm:text-base`
  - Benefits text from `text-xs sm:text-sm` → `text-sm sm:text-base`

- **Touch targets (44px minimum):**
  - Service card icon containers: added `min-w-[44px] min-h-[44px]`
  - Business feature icon containers: added `min-w-[44px] min-h-[44px]`
  - Core feature icon containers: added `min-w-[44px] min-h-[44px]`
  - Step number containers: added `min-w-[44px] min-h-[44px]`
  - Specialization icon containers: increased from `w-8 h-8` → `w-10 h-10` + `min-w-[44px] min-h-[44px]`
  - "How it works" step containers: added `min-w-[44px] min-h-[44px]`
  - Steps section number circles: added `min-w-[44px] min-h-[44px]`
  - CTA buttons: h-11 → h-12, added `min-w-[44px]`
  - Demo chat bubbles: added `min-h-[44px]`, padding increased from `py-2.5` → `py-3`

- **Layout improvements:**
  - Benefits grid: changed from `lg:grid-cols-5 gap-3` → `lg:grid-cols-3 gap-3 sm:gap-4` (5 columns was too narrow on desktop; 3 columns with 5 items gives 3+2, better layout)
  - Specialization cards: added role title labels alongside icons for clearer understanding
  - Specialization icon size: increased from `w-4 h-4` → `w-5 h-5`

- **Lint check:** No errors in landing-page.tsx or i18n.ts after all changes

## Files Modified
- `/home/z/my-project/src/lib/i18n.ts` — translations for AR and EN
- `/home/z/my-project/src/components/landing/landing-page.tsx` — component structure and styling
