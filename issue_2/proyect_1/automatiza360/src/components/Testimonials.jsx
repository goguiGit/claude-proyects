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
