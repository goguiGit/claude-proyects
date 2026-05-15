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
