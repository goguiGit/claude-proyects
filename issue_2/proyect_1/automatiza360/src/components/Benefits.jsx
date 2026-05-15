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
