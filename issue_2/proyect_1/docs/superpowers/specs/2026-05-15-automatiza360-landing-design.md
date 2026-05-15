# Automatiza360 — Landing Page Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## Overview

A premium, conversion-oriented landing page for Automatiza360, a company that helps SMBs and digital businesses save time and increase sales through automation, AI agents, and connected workflows (WhatsApp, email, CRM, forms, calendars, databases).

**Primary goal:** Get visitors to book a free strategy call (diagnóstico gratuito).

---

## Tech Stack

- **Framework:** React + Vite
- **Styling:** Tailwind CSS v3
- **Animations:** CSS transitions (no Framer Motion — keep it lean)
- **Font:** Inter (Google Fonts)
- **No external UI libraries** — custom components only

---

## Visual Design

### Palette — Dark Tech (Azul marino / Cyan)
| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#060b14` | Page background |
| `bg-card` | `#0a0f1e` | Section backgrounds |
| `bg-elevated` | `#0d1b2a` | Cards, inputs |
| `accent-blue` | `#0ea5e9` | Primary accent, CTAs |
| `accent-cyan` | `#06b6d4` | Secondary accent, gradients |
| `text-primary` | `#f1f5f9` | Headings |
| `text-secondary` | `#94a3b8` | Body text |
| `text-muted` | `#475569` | Labels, captions |
| `border` | `rgba(14,165,233,0.15)` | Card borders |

### Typography
- **Display headings:** `font-extrabold`, large size, tight line-height
- **Gradient text:** accent-blue → accent-cyan on key headline words
- **Body:** `text-slate-400`, relaxed line-height

### CTA Buttons
- **Primary:** gradient bg `from-[#0ea5e9] to-[#06b6d4]`, white text, bold
- **Secondary:** transparent with `border-[#0ea5e9]`, cyan text

---

## Component Structure

```
src/
├── main.jsx
├── App.jsx
├── index.css          # Tailwind directives + custom CSS vars
├── components/
│   ├── Navbar.jsx
│   ├── Hero.jsx           # includes HeroVisual (Antes/Después split)
│   ├── Credibility.jsx
│   ├── Problems.jsx
│   ├── Benefits.jsx
│   ├── HowItWorks.jsx
│   ├── UseCases.jsx
│   ├── Testimonials.jsx
│   ├── FAQ.jsx
│   ├── FinalCTA.jsx
│   └── Footer.jsx
└── constants/
    └── content.js         # All copy in one place for easy editing
```

Each component is a single-purpose file. All text content lives in `constants/content.js` so copy edits don't require touching component logic.

---

## Section Specs

### 0. Navbar
- Sticky, `backdrop-blur` + semi-transparent dark background on scroll
- Logo: `Automatiza` + `360` in cyan
- Nav links: Cómo funciona, Casos de uso, Testimonios, FAQ
- CTA button: "Reserva una llamada" (gradient)
- Mobile: hamburger menu, full-screen overlay

### 1. Hero ⭐
- **Layout:** 2-column grid on desktop, stacked on mobile
- **Left:** Badge → H1 → subtitle → CTA buttons → trust signals
- **H1:** "Tu negocio vendiendo mientras tú duermes"
- **Gradient word:** "vendiendo" or key phrase in accent gradient
- **Primary CTA:** "Reserva tu llamada gratis →"
- **Secondary CTA:** "▷ Ver cómo funciona" (scroll anchor)
- **Trust signals:** ✓ Sin compromisos · ✓ Diagnóstico en 30 min · ✓ +80 empresas
- **Right — HeroVisual:** Dark card showing Antes/Después split + 3 KPI metrics
  - Antes column: 4 pain points with ✗ red
  - Después column: 4 solutions with ✓ green
  - Metrics row: +40% Conversión · 12h Ahorradas/día · 3.2x ROI medio
- **Background:** Subtle radial gradient glow behind hero

### 2. Credibility
- 4-column metric strip
- Metrics: +80 empresas · 12h ahorradas/día · 3.2x ROI · 98% tasa respuesta
- Numbers in large accent-blue, labels in muted

### 3. Problems
- Headline: "¿Te suena alguno de estos?"
- 3 cards with emoji icon, title, description
- Problems: Tareas repetitivas · Leads sin respuesta · Herramientas desconectadas
- Subtle red-tinted border to signal pain

### 4. Benefits
- 6-card grid (3×2)
- Each card: icon in accent-tinted square, title, description
- Benefits: Respuesta 24/7 · Seguimiento automático · Todo conectado · Más ventas mismo equipo · Decisiones con datos · Implementación rápida

### 5. How It Works
- 3-step horizontal flow with numbered circles (gradient bg)
- Step 1: Diagnóstico gratuito
- Step 2: Diseño e implementación
- Step 3: Tu negocio en piloto automático
- Connector arrows between steps on desktop

### 6. Use Cases
- 4×2 card grid
- 7 real use cases + 1 "custom" placeholder card
- Each card: emoji, title, one-line description
- Cases: Captación leads · Seguimiento WhatsApp · Agendado automático · IA clasifica leads · Atención al cliente · Presupuestos · Sync CRM

### 7. Testimonials
- 3-card grid
- Each: 5 stars · quote · author name · role + company
- Subtle card border, italic quote text

### 8. FAQ
- 4 accordion items (expanded by default in static version, togglable)
- Questions: implementación tiempo · cambio de herramientas · fallos · tamaño empresa

### 9. Final CTA ⭐
- Full-width section with subtle gradient bg + border glow
- Badge: "Diagnóstico gratuito"
- H2: "¿Listo para que tu negocio trabaje solo?"
- Subtext: 30 minutos, sin compromiso
- Single large primary CTA button
- Trust strip: ✓ Sin tarjeta · ✓ Resultados medibles · ✓ +80 empresas

### 10. Footer
- Logo left · nav links center · copyright right
- Links: Política de privacidad · Aviso legal · Contacto

---

## Responsive Behavior

| Breakpoint | Key changes |
|------------|-------------|
| `lg` (≥1024px) | Hero 2-col, Benefits 3-col, Cases 4-col |
| `md` (≥768px) | Credibility 4-col, Problems 3-col, How It Works horizontal |
| `sm` (<768px) | All single column, hero stacked, navbar hamburger |

---

## Content Architecture

All copy lives in `src/constants/content.js` as plain JS objects. Components import and render — no hardcoded strings in JSX. This makes visual iteration and copy edits trivial.

---

## Constraints

- No external CSS framework beyond Tailwind
- No Framer Motion — CSS `transition` only
- Tailwind config extended with custom colors matching the palette above
- `.superpowers/` added to `.gitignore`
