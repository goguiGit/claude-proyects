import { CONTENT } from '../constants/content'

export default function FinalCTA() {
  const { finalCta } = CONTENT
  return (
    <section id="contacto" className="py-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-gradient-to-br from-accent-blue/10 to-accent-cyan/5 border border-accent-blue/20 rounded-3xl p-12 text-center overflow-hidden">
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
