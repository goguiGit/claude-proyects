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
          <div className="card border-dashed border-accent-blue/20 flex flex-col items-center justify-center text-center gap-2 min-h-[100px]">
            <span className="text-accent-blue text-2xl font-bold">+</span>
            <p className="text-slate-600 text-xs">Tu caso de uso personalizado</p>
          </div>
        </div>
      </div>
    </section>
  )
}
