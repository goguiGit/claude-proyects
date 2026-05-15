import { CONTENT } from '../constants/content'

function HeroVisual({ visual }) {
  return (
    <div className="bg-bg-card border border-accent-blue/20 rounded-2xl p-5">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">{visual.label}</p>

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
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-accent-cyan/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-slate-100 mb-6">
            {hero.title[0]}{' '}
            <span className="gradient-text">{hero.title[1]}</span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-lg">
            {hero.subtitle}
          </p>

          <div className="flex flex-wrap gap-4 mb-8">
            <a href="#contacto" className="btn-primary text-base">
              {hero.ctaPrimary}
            </a>
            <a href="#como-funciona" className="btn-secondary text-base">
              {hero.ctaSecondary}
            </a>
          </div>

          <div className="flex flex-wrap gap-4">
            {hero.trust.map((t) => (
              <span key={t} className="text-slate-500 text-sm flex items-center gap-1.5">
                <span className="text-accent-cyan">✓</span> {t}
              </span>
            ))}
          </div>
        </div>

        <HeroVisual visual={hero.visual} />
      </div>
    </section>
  )
}
