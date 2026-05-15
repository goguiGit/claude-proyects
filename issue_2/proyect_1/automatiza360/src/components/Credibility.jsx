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
