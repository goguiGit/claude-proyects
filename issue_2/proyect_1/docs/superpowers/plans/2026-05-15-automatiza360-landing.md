# Automatiza360 Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium, conversion-oriented landing page for Automatiza360 using React + Vite + Tailwind CSS that runs with `npm run dev`.

**Architecture:** 11 single-purpose components assembled in `App.jsx`, all copy centralized in `constants/content.js`, Tailwind extended with a custom Dark Tech palette. No external UI libraries — CSS transitions only.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, Vitest, @testing-library/react, Inter (Google Fonts)

---

## File Map

| File | Responsibility |
|------|---------------|
| `vite.config.js` | Vite config with test setup |
| `tailwind.config.js` | Extended palette + Inter font |
| `src/index.css` | Tailwind directives + base styles |
| `src/main.jsx` | React entry point |
| `src/App.jsx` | Assembles all sections |
| `src/constants/content.js` | All copy/data (single source of truth) |
| `src/components/Navbar.jsx` | Sticky nav + mobile hamburger |
| `src/components/Hero.jsx` | Hero + HeroVisual split |
| `src/components/Credibility.jsx` | 4-metric strip |
| `src/components/Problems.jsx` | 3 pain-point cards |
| `src/components/Benefits.jsx` | 6 benefit cards |
| `src/components/HowItWorks.jsx` | 3-step process |
| `src/components/UseCases.jsx` | 7+1 use case cards |
| `src/components/Testimonials.jsx` | 3 testimonial cards |
| `src/components/FAQ.jsx` | 4 accordion items |
| `src/components/FinalCTA.jsx` | Closing CTA section |
| `src/components/Footer.jsx` | Logo + links + copyright |
| `src/__tests__/components.test.jsx` | Render smoke tests |

---

## Task 1: Scaffold the Vite + React project

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html` (via Vite scaffolding)

- [ ] **Step 1: Create the Vite project**

Run inside `issue_2/proyect_1/`:
```bash
npm create vite@latest automatiza360 -- --template react
cd automatiza360
npm install
```

- [ ] **Step 2: Install Tailwind CSS**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 4: Configure Vite for tests**

Replace `vite.config.js` with:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})
```

- [ ] **Step 5: Create test setup file**

Create `src/test-setup.js`:
```js
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```
Expected: Server running at `http://localhost:5173`

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: scaffold Vite + React + Tailwind + Vitest"
```

---

## Task 2: Tailwind config, base styles, and content constants

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`
- Create: `src/constants/content.js`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react'
import { CONTENT } from '../constants/content'

test('CONTENT has required top-level keys', () => {
  expect(CONTENT).toHaveProperty('hero')
  expect(CONTENT).toHaveProperty('credibility')
  expect(CONTENT).toHaveProperty('problems')
  expect(CONTENT).toHaveProperty('benefits')
  expect(CONTENT).toHaveProperty('howItWorks')
  expect(CONTENT).toHaveProperty('useCases')
  expect(CONTENT).toHaveProperty('testimonials')
  expect(CONTENT).toHaveProperty('faq')
  expect(CONTENT).toHaveProperty('finalCta')
  expect(CONTENT).toHaveProperty('footer')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run
```
Expected: FAIL — "Cannot find module '../constants/content'"

- [ ] **Step 3: Configure Tailwind**

Replace `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#060b14',
        'bg-card': '#0a0f1e',
        'bg-elevated': '#0d1b2a',
        'accent-blue': '#0ea5e9',
        'accent-cyan': '#06b6d4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Update index.css**

Replace `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

@layer base {
  body {
    @apply bg-bg-primary text-slate-200 font-sans;
  }
  * {
    @apply box-border;
  }
}

@layer utilities {
  .gradient-text {
    @apply bg-gradient-to-r from-accent-blue to-accent-cyan bg-clip-text text-transparent;
  }
  .btn-primary {
    @apply bg-gradient-to-r from-accent-blue to-accent-cyan text-white font-bold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity;
  }
  .btn-secondary {
    @apply border border-accent-blue/40 text-accent-blue font-semibold px-6 py-3 rounded-lg hover:border-accent-blue/70 transition-colors;
  }
  .card {
    @apply bg-bg-elevated border border-accent-blue/15 rounded-xl p-5;
  }
  .section-heading {
    @apply text-2xl md:text-3xl font-extrabold text-slate-100;
  }
  .section-sub {
    @apply text-slate-400 text-sm md:text-base mt-3;
  }
}
```

- [ ] **Step 5: Create content constants**

Create `src/constants/content.js`:
```js
export const CONTENT = {
  nav: {
    logo: 'Automatiza360',
    links: [
      { label: 'Cómo funciona', href: '#como-funciona' },
      { label: 'Casos de uso', href: '#casos-de-uso' },
      { label: 'Testimonios', href: '#testimonios' },
      { label: 'FAQ', href: '#faq' },
    ],
    cta: 'Reserva una llamada',
  },
  hero: {
    badge: '🤖 IA + Automatización para negocios',
    title: ['Tu negocio vendiendo', 'mientras tú duermes'],
    titleGradient: 'mientras tú duermes',
    subtitle:
      'Implementamos automatizaciones e inteligencia artificial para que vendas más, ahorres tiempo y dejes de depender de tareas manuales.',
    ctaPrimary: 'Reserva tu llamada gratis →',
    ctaSecondary: '▷ Ver cómo funciona',
    trust: ['Sin compromisos', 'Diagnóstico en 30 min', '+80 empresas'],
    visual: {
      label: 'Antes y después de Automatiza360',
      before: {
        label: '❌ Antes',
        items: [
          'Seguimiento manual por email',
          'Leads sin respuesta 24h+',
          'CRM desactualizado',
          'Reuniones sin agendar',
        ],
      },
      after: {
        label: '✅ Después',
        items: [
          'WhatsApp automático al instante',
          'IA clasifica y responde',
          'CRM siempre al día',
          'Agenda sin intervención',
        ],
      },
      metrics: [
        { value: '+40%', label: 'Conversión' },
        { value: '12h', label: 'Ahorradas/día' },
        { value: '3.2x', label: 'ROI medio' },
      ],
    },
  },
  credibility: {
    heading: 'Resultados que hablan',
    items: [
      { value: '+80', label: 'empresas automatizadas' },
      { value: '12h', label: 'ahorradas por día de media' },
      { value: '3.2x', label: 'ROI en 90 días' },
      { value: '98%', label: 'tasa de respuesta automática' },
    ],
  },
  problems: {
    heading: '¿Te suena alguno de estos?',
    subheading: 'Los problemas más comunes que resolvemos cada semana',
    items: [
      {
        icon: '⏱️',
        title: 'Pierdes horas en tareas repetitivas',
        desc: 'Copiar datos, enviar emails, actualizar hojas de cálculo... tiempo que debería ir a crecer.',
      },
      {
        icon: '📉',
        title: 'Leads que se enfrían sin respuesta',
        desc: 'Un lead interesado hoy puede estar en la competencia mañana si no respondiste a tiempo.',
      },
      {
        icon: '🔗',
        title: 'Herramientas que no se hablan',
        desc: 'CRM, email, WhatsApp, formularios... todo por separado. Información duplicada, errores constantes.',
      },
    ],
  },
  benefits: {
    heading: 'Lo que cambia cuando automatizas',
    items: [
      { icon: '⚡', title: 'Respuesta inmediata 24/7', desc: 'Tu negocio responde en segundos a cualquier hora, sin intervención humana.' },
      { icon: '🎯', title: 'Seguimiento comercial automático', desc: 'Cada lead recibe seguimiento personalizado sin que nadie tenga que recordarlo.' },
      { icon: '🔄', title: 'Todo conectado', desc: 'WhatsApp, email, CRM, calendario y formularios funcionando como uno solo.' },
      { icon: '📈', title: 'Más ventas, mismo equipo', desc: 'Aumenta la capacidad sin contratar: la IA hace el trabajo repetitivo.' },
      { icon: '🧠', title: 'Decisiones con datos reales', desc: 'Paneles automáticos con métricas de ventas, leads y conversiones actualizadas.' },
      { icon: '🚀', title: 'Implementación en días', desc: 'No meses de consultoría. Sistemas funcionando en tu negocio en 1-2 semanas.' },
    ],
  },
  howItWorks: {
    heading: 'Tres pasos para automatizar tu negocio',
    subheading: 'Sin tecnicismos. Sin complicaciones.',
    steps: [
      {
        num: '1',
        title: 'Diagnóstico gratuito',
        desc: 'Analizamos tu negocio, detectamos cuellos de botella y oportunidades de automatización en 30 minutos.',
      },
      {
        num: '2',
        title: 'Diseño e implementación',
        desc: 'Construimos los flujos personalizados, integramos tus herramientas y lo dejamos funcionando.',
      },
      {
        num: '3',
        title: 'Tu negocio en piloto automático',
        desc: 'Resultados medibles desde la primera semana. Tú te enfocas en crecer, nosotros en mantener.',
      },
    ],
  },
  useCases: {
    heading: '¿Qué puedes automatizar?',
    subheading: 'Casos reales que implementamos para negocios como el tuyo',
    items: [
      { icon: '🎯', title: 'Captación de leads', desc: 'Formularios → CRM + notificación instantánea' },
      { icon: '💬', title: 'Seguimiento WhatsApp', desc: 'Secuencias automáticas post-contacto' },
      { icon: '📅', title: 'Agendado automático', desc: 'Reuniones sin ida y vuelta de emails' },
      { icon: '🤖', title: 'IA clasifica leads', desc: 'Priorización automática por interés y perfil' },
      { icon: '🎧', title: 'Atención al cliente', desc: 'Respuestas automáticas a preguntas frecuentes' },
      { icon: '📄', title: 'Presupuestos automáticos', desc: 'Generación y envío sin intervención manual' },
      { icon: '🔗', title: 'Sync CRM', desc: 'Datos siempre actualizados entre herramientas' },
    ],
  },
  testimonials: {
    heading: 'Lo que dicen nuestros clientes',
    items: [
      {
        quote: 'Pasamos de perder leads a responder en segundos. En 3 semanas ya recuperamos lo invertido.',
        author: 'María G.',
        role: 'Directora Comercial · Agencia de Marketing',
      },
      {
        quote: 'Mi equipo ahorra 3 horas diarias. Lo que antes era manual ahora simplemente ocurre solo.',
        author: 'Carlos M.',
        role: 'CEO · Consultoría B2B',
      },
      {
        quote: 'Teníamos leads pero no seguimiento. Ahora el CRM se actualiza solo y las reuniones se agendan solas.',
        author: 'Laura P.',
        role: 'Fundadora · Infoproductos',
      },
    ],
  },
  faq: {
    heading: 'Preguntas frecuentes',
    items: [
      {
        q: '¿Cuánto tiempo tarda la implementación?',
        a: 'Entre 1 y 2 semanas según la complejidad. Los primeros flujos suelen estar activos en 3-5 días.',
      },
      {
        q: '¿Necesito cambiar mis herramientas actuales?',
        a: 'No. Trabajamos con las herramientas que ya usas: WhatsApp, Gmail, HubSpot, Notion, Calendly, etc.',
      },
      {
        q: '¿Qué pasa si algo falla?',
        a: 'Monitorizamos los sistemas y tienes soporte directo. Los errores se detectan antes de que los veas.',
      },
      {
        q: '¿Es para empresas grandes o pequeñas?',
        a: 'Para pymes y negocios digitales de 1 a 50 personas. Precisamente donde la automatización tiene más impacto.',
      },
    ],
  },
  finalCta: {
    badge: 'Diagnóstico gratuito',
    heading: ['¿Listo para que tu negocio', 'trabaje solo?'],
    headingGradient: 'trabaje solo?',
    subheading: '30 minutos. Sin compromiso. Detectamos exactamente qué automatizar para que veas resultados en días.',
    cta: 'Reserva tu diagnóstico gratuito →',
    trust: ['Sin tarjeta de crédito', 'Resultados medibles', '+80 empresas confían'],
  },
  footer: {
    logo: 'Automatiza360',
    links: [
      { label: 'Política de privacidad', href: '#' },
      { label: 'Aviso legal', href: '#' },
      { label: 'Contacto', href: '#' },
    ],
    copy: '© 2025 Automatiza360. Todos los derechos reservados.',
  },
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npm run test -- --run
```
Expected: PASS — 1 test passed

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: tailwind config, base styles, and content constants"
```

---

## Task 3: Navbar component

**Files:**
- Create: `src/components/Navbar.jsx`
- Modify: `src/__tests__/components.test.jsx`

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/components.test.jsx`:
```jsx
import Navbar from '../components/Navbar'

test('Navbar renders logo and CTA', () => {
  render(<Navbar />)
  expect(screen.getByText(/Automatiza/)).toBeInTheDocument()
  expect(screen.getByText(/Reserva una llamada/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run
```
Expected: FAIL — "Cannot find module '../components/Navbar'"

- [ ] **Step 3: Implement Navbar**

Create `src/components/Navbar.jsx`:
```jsx
import { useState, useEffect } from 'react'
import { CONTENT } from '../constants/content'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { nav } = CONTENT

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-bg-primary/90 backdrop-blur-md border-b border-accent-blue/10' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="text-xl font-extrabold tracking-tight">
          <span className="text-slate-100">Automatiza</span>
          <span className="text-accent-cyan">360</span>
        </a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {nav.links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm text-slate-400 hover:text-slate-100 transition-colors"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <a href="#contacto" className="hidden md:inline-flex btn-primary text-sm">
          {nav.cta}
        </a>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-slate-400 hover:text-slate-100 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-bg-card border-t border-accent-blue/10 px-4 py-6 flex flex-col gap-4">
          {nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-slate-300 hover:text-slate-100 transition-colors text-sm"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a href="#contacto" className="btn-primary text-sm text-center mt-2">
            {nav.cta}
          </a>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- --run
```
Expected: PASS — 2 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.jsx src/__tests__/components.test.jsx
git commit -m "feat: Navbar component with mobile menu"
```

---

## Task 4: Hero component

**Files:**
- Create: `src/components/Hero.jsx`
- Modify: `src/__tests__/components.test.jsx`

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/components.test.jsx`:
```jsx
import Hero from '../components/Hero'

test('Hero renders headline and CTA buttons', () => {
  render(<Hero />)
  expect(screen.getByText(/Tu negocio vendiendo/)).toBeInTheDocument()
  expect(screen.getByText(/Reserva tu llamada gratis/)).toBeInTheDocument()
  expect(screen.getByText(/Ver cómo funciona/)).toBeInTheDocument()
})

test('HeroVisual renders Antes/Después labels', () => {
  render(<Hero />)
  expect(screen.getByText(/Antes/)).toBeInTheDocument()
  expect(screen.getByText(/Después/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run
```
Expected: FAIL — "Cannot find module '../components/Hero'"

- [ ] **Step 3: Implement Hero**

Create `src/components/Hero.jsx`:
```jsx
import { CONTENT } from '../constants/content'

function HeroVisual({ visual }) {
  return (
    <div className="bg-bg-card border border-accent-blue/20 rounded-2xl p-5">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">{visual.label}</p>

      {/* Before / After split */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-bg-primary rounded-xl p-3">
          <p className="text-xs font-bold text-red-400 mb-2">{visual.before.label}</p>
          {visual.before.items.map((item) => (
            <div key={item} className="flex items-start gap-1.5 py-1 border-b border-white/5 last:border-0">
              <span className="text-red-500 text-xs mt-0.5">✗</span>
              <span className="text-slate-500 text-xs leading-snug">{item}</span>
            </div>
          ))}
        </div>
        <div className="bg-bg-primary rounded-xl p-3">
          <p className="text-xs font-bold text-green-400 mb-2">{visual.after.label}</p>
          {visual.after.items.map((item) => (
            <div key={item} className="flex items-start gap-1.5 py-1 border-b border-white/5 last:border-0">
              <span className="text-green-500 text-xs mt-0.5">✓</span>
              <span className="text-slate-400 text-xs leading-snug">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        {visual.metrics.map((m) => (
          <div key={m.label} className="bg-bg-primary rounded-lg p-3 text-center">
            <p className="text-accent-blue font-extrabold text-lg leading-none">{m.value}</p>
            <p className="text-slate-500 text-xs mt-1">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Hero() {
  const { hero } = CONTENT

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-accent-cyan/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left — copy */}
        <div>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-accent-blue/10 border border-accent-blue/30 rounded-full px-4 py-1.5 text-xs text-accent-blue font-semibold mb-6">
            {hero.badge}
          </div>

          {/* H1 */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-slate-100 mb-6">
            {hero.title[0]}{' '}
            <span className="gradient-text">{hero.title[1]}</span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-lg">
            {hero.subtitle}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4 mb-8">
            <a href="#contacto" className="btn-primary text-base">
              {hero.ctaPrimary}
            </a>
            <a href="#como-funciona" className="btn-secondary text-base">
              {hero.ctaSecondary}
            </a>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap gap-4">
            {hero.trust.map((t) => (
              <span key={t} className="text-slate-500 text-sm flex items-center gap-1.5">
                <span className="text-accent-cyan">✓</span> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Right — visual */}
        <HeroVisual visual={hero.visual} />
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- --run
```
Expected: PASS — 4 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/components/Hero.jsx src/__tests__/components.test.jsx
git commit -m "feat: Hero component with HeroVisual Antes/Después split"
```

---

## Task 5: Credibility, Problems, Benefits

**Files:**
- Create: `src/components/Credibility.jsx`, `src/components/Problems.jsx`, `src/components/Benefits.jsx`
- Modify: `src/__tests__/components.test.jsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/components.test.jsx`:
```jsx
import Credibility from '../components/Credibility'
import Problems from '../components/Problems'
import Benefits from '../components/Benefits'

test('Credibility renders 4 metrics', () => {
  render(<Credibility />)
  expect(screen.getByText('+80')).toBeInTheDocument()
  expect(screen.getByText('3.2x')).toBeInTheDocument()
})

test('Problems renders pain point cards', () => {
  render(<Problems />)
  expect(screen.getByText(/Te suena alguno/)).toBeInTheDocument()
  expect(screen.getByText(/Leads que se enfrían/)).toBeInTheDocument()
})

test('Benefits renders 6 benefit cards', () => {
  render(<Benefits />)
  expect(screen.getAllByRole('article')).toHaveLength(6)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run
```
Expected: FAIL — 3 new failures

- [ ] **Step 3: Implement Credibility**

Create `src/components/Credibility.jsx`:
```jsx
import { CONTENT } from '../constants/content'

export default function Credibility() {
  const { credibility } = CONTENT
  return (
    <section className="py-16 border-y border-accent-blue/10 bg-bg-card/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {credibility.items.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-3xl md:text-4xl font-extrabold text-accent-blue">{item.value}</p>
              <p className="text-slate-500 text-sm mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Implement Problems**

Create `src/components/Problems.jsx`:
```jsx
import { CONTENT } from '../constants/content'

export default function Problems() {
  const { problems } = CONTENT
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="section-heading">{problems.heading}</h2>
          <p className="section-sub">{problems.subheading}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.items.map((item) => (
            <div key={item.title} className="card border-red-500/15 hover:border-red-500/30 transition-colors">
              <div className="text-3xl mb-4">{item.icon}</div>
              <h3 className="text-slate-100 font-bold text-base mb-2">{item.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Implement Benefits**

Create `src/components/Benefits.jsx`:
```jsx
import { CONTENT } from '../constants/content'

export default function Benefits() {
  const { benefits } = CONTENT
  return (
    <section className="py-24 bg-bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="section-heading">{benefits.heading}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.items.map((item) => (
            <article key={item.title} className="card hover:border-accent-blue/30 transition-colors">
              <div className="w-10 h-10 bg-accent-blue/10 rounded-xl flex items-center justify-center text-xl mb-4">
                {item.icon}
              </div>
              <h3 className="text-slate-100 font-bold text-base mb-2">{item.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm run test -- --run
```
Expected: PASS — 7 tests passed

- [ ] **Step 7: Commit**

```bash
git add src/components/Credibility.jsx src/components/Problems.jsx src/components/Benefits.jsx src/__tests__/components.test.jsx
git commit -m "feat: Credibility, Problems, Benefits components"
```

---

## Task 6: HowItWorks and UseCases

**Files:**
- Create: `src/components/HowItWorks.jsx`, `src/components/UseCases.jsx`
- Modify: `src/__tests__/components.test.jsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/components.test.jsx`:
```jsx
import HowItWorks from '../components/HowItWorks'
import UseCases from '../components/UseCases'

test('HowItWorks renders 3 steps', () => {
  render(<HowItWorks />)
  expect(screen.getByText('Diagnóstico gratuito')).toBeInTheDocument()
  expect(screen.getByText('Diseño e implementación')).toBeInTheDocument()
  expect(screen.getByText(/piloto automático/)).toBeInTheDocument()
})

test('UseCases renders use case cards', () => {
  render(<UseCases />)
  expect(screen.getByText('Captación de leads')).toBeInTheDocument()
  expect(screen.getByText('Agendado automático')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run
```
Expected: FAIL — 2 new failures

- [ ] **Step 3: Implement HowItWorks**

Create `src/components/HowItWorks.jsx`:
```jsx
import { CONTENT } from '../constants/content'

export default function HowItWorks() {
  const { howItWorks } = CONTENT
  return (
    <section id="como-funciona" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="section-heading">{howItWorks.heading}</h2>
          <p className="section-sub">{howItWorks.subheading}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-8 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-gradient-to-r from-accent-blue/30 via-accent-cyan/30 to-accent-blue/30" />

          {howItWorks.steps.map((step) => (
            <div key={step.num} className="flex flex-col items-center text-center relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center text-white text-2xl font-extrabold mb-6 ring-4 ring-bg-primary">
                {step.num}
              </div>
              <h3 className="text-slate-100 font-bold text-lg mb-3">{step.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Implement UseCases**

Create `src/components/UseCases.jsx`:
```jsx
import { CONTENT } from '../constants/content'

export default function UseCases() {
  const { useCases } = CONTENT
  return (
    <section id="casos-de-uso" className="py-24 bg-bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="section-heading">{useCases.heading}</h2>
          <p className="section-sub">{useCases.subheading}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {useCases.items.map((item) => (
            <div key={item.title} className="card hover:border-accent-blue/30 transition-colors">
              <div className="text-2xl mb-3">{item.icon}</div>
              <h3 className="text-accent-blue font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
          {/* Custom use case placeholder */}
          <div className="card border-dashed border-accent-blue/20 flex flex-col items-center justify-center text-center gap-2 min-h-[100px]">
            <span className="text-accent-blue text-2xl font-bold">+</span>
            <p className="text-slate-600 text-xs">Tu caso de uso personalizado</p>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test -- --run
```
Expected: PASS — 9 tests passed

- [ ] **Step 6: Commit**

```bash
git add src/components/HowItWorks.jsx src/components/UseCases.jsx src/__tests__/components.test.jsx
git commit -m "feat: HowItWorks and UseCases components"
```

---

## Task 7: Testimonials, FAQ, FinalCTA, Footer

**Files:**
- Create: `src/components/Testimonials.jsx`, `src/components/FAQ.jsx`, `src/components/FinalCTA.jsx`, `src/components/Footer.jsx`
- Modify: `src/__tests__/components.test.jsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/components.test.jsx`:
```jsx
import Testimonials from '../components/Testimonials'
import FAQ from '../components/FAQ'
import FinalCTA from '../components/FinalCTA'
import Footer from '../components/Footer'

test('Testimonials renders 3 quotes', () => {
  render(<Testimonials />)
  expect(screen.getByText(/recuperamos lo invertido/)).toBeInTheDocument()
  expect(screen.getByText(/María G\./)).toBeInTheDocument()
})

test('FAQ renders all questions', () => {
  render(<FAQ />)
  expect(screen.getByText(/Cuánto tiempo tarda/)).toBeInTheDocument()
  expect(screen.getByText(/cambiar mis herramientas/)).toBeInTheDocument()
})

test('FinalCTA renders main CTA button', () => {
  render(<FinalCTA />)
  expect(screen.getByText(/diagnóstico gratuito/i)).toBeInTheDocument()
})

test('Footer renders logo and copyright', () => {
  render(<Footer />)
  expect(screen.getByText(/Automatiza/)).toBeInTheDocument()
  expect(screen.getByText(/2025/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run
```
Expected: FAIL — 4 new failures

- [ ] **Step 3: Implement Testimonials**

Create `src/components/Testimonials.jsx`:
```jsx
import { CONTENT } from '../constants/content'

export default function Testimonials() {
  const { testimonials } = CONTENT
  return (
    <section id="testimonios" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="section-heading">{testimonials.heading}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.items.map((t) => (
            <div key={t.author} className="card flex flex-col gap-4">
              <div className="text-yellow-400 text-sm tracking-widest">★★★★★</div>
              <p className="text-slate-400 text-sm leading-relaxed italic flex-1">"{t.quote}"</p>
              <div>
                <p className="text-slate-100 font-semibold text-sm">{t.author}</p>
                <p className="text-slate-600 text-xs mt-0.5">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Implement FAQ**

Create `src/components/FAQ.jsx`:
```jsx
import { useState } from 'react'
import { CONTENT } from '../constants/content'

function FAQItem({ item }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card cursor-pointer" onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-slate-100 font-semibold text-sm">{item.q}</h3>
        <span className={`text-accent-blue transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </div>
      {open && (
        <p className="text-slate-500 text-sm leading-relaxed mt-3 pt-3 border-t border-accent-blue/10">
          {item.a}
        </p>
      )}
    </div>
  )
}

export default function FAQ() {
  const { faq } = CONTENT
  return (
    <section id="faq" className="py-24 bg-bg-card/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="section-heading">{faq.heading}</h2>
        </div>
        <div className="flex flex-col gap-3">
          {faq.items.map((item) => (
            <FAQItem key={item.q} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Implement FinalCTA**

Create `src/components/FinalCTA.jsx`:
```jsx
import { CONTENT } from '../constants/content'

export default function FinalCTA() {
  const { finalCta } = CONTENT
  return (
    <section id="contacto" className="py-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-gradient-to-br from-accent-blue/10 to-accent-cyan/5 border border-accent-blue/20 rounded-3xl p-12 text-center overflow-hidden">
          {/* Glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-accent-blue/10 rounded-full blur-3xl" />
          </div>

          <div className="relative">
            <span className="inline-block text-xs font-bold text-accent-blue uppercase tracking-widest border border-accent-blue/30 rounded-full px-4 py-1.5 mb-6">
              {finalCta.badge}
            </span>

            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-100 mb-6 leading-tight">
              {finalCta.heading[0]}{' '}
              <span className="gradient-text">{finalCta.heading[1]}</span>
            </h2>

            <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              {finalCta.subheading}
            </p>

            <a href="#" className="btn-primary text-lg inline-flex">
              {finalCta.cta}
            </a>

            <div className="flex flex-wrap justify-center gap-6 mt-8">
              {finalCta.trust.map((t) => (
                <span key={t} className="text-slate-600 text-sm flex items-center gap-1.5">
                  <span className="text-accent-cyan">✓</span> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Implement Footer**

Create `src/components/Footer.jsx`:
```jsx
import { CONTENT } from '../constants/content'

export default function Footer() {
  const { footer } = CONTENT
  return (
    <footer className="border-t border-accent-blue/10 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-base font-extrabold">
          <span className="text-slate-100">Automatiza</span>
          <span className="text-accent-cyan">360</span>
        </span>

        <div className="flex flex-wrap justify-center gap-6">
          {footer.links.map((link) => (
            <a key={link.label} href={link.href} className="text-slate-600 text-xs hover:text-slate-400 transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        <p className="text-slate-700 text-xs">{footer.copy}</p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npm run test -- --run
```
Expected: PASS — 13 tests passed

- [ ] **Step 8: Commit**

```bash
git add src/components/Testimonials.jsx src/components/FAQ.jsx src/components/FinalCTA.jsx src/components/Footer.jsx src/__tests__/components.test.jsx
git commit -m "feat: Testimonials, FAQ, FinalCTA, Footer components"
```

---

## Task 8: Assemble App.jsx and final polish

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/main.jsx`
- Modify: `index.html`
- Create: `.gitignore` entry for `.superpowers/`

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/components.test.jsx`:
```jsx
import App from '../App'

test('App renders all major sections', () => {
  render(<App />)
  expect(screen.getByText(/Tu negocio vendiendo/)).toBeInTheDocument()
  expect(screen.getByText(/Cómo funciona/i)).toBeInTheDocument()
  expect(screen.getByText(/Lo que dicen/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run
```
Expected: FAIL — App import fails

- [ ] **Step 3: Implement App.jsx**

Replace `src/App.jsx`:
```jsx
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Credibility from './components/Credibility'
import Problems from './components/Problems'
import Benefits from './components/Benefits'
import HowItWorks from './components/HowItWorks'
import UseCases from './components/UseCases'
import Testimonials from './components/Testimonials'
import FAQ from './components/FAQ'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <main>
        <Hero />
        <Credibility />
        <Problems />
        <Benefits />
        <HowItWorks />
        <UseCases />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 4: Update main.jsx**

Replace `src/main.jsx`:
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Update index.html title**

In `index.html`, replace the `<title>` tag:
```html
<title>Automatiza360 — Automatización e IA para tu negocio</title>
```

- [ ] **Step 6: Add .superpowers to .gitignore**

In `.gitignore` (create if absent), add:
```
.superpowers/
```

- [ ] **Step 7: Run all tests**

```bash
npm run test -- --run
```
Expected: PASS — 14 tests passed, 0 failed

- [ ] **Step 8: Start dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:5173` and verify:
- Navbar is visible and sticky on scroll
- Hero section shows headline + HeroVisual split
- All sections render down the page
- Mobile: resize to <768px, hamburger menu appears
- No console errors

- [ ] **Step 9: Final commit**

```bash
git add .
git commit -m "feat: assemble App.jsx — Automatiza360 landing page complete"
```

---

## Running the landing

```bash
cd automatiza360
npm run dev
# → http://localhost:5173

npm run test -- --run
# → 14 tests, 0 failed

npm run build
# → dist/ ready for deployment
```
