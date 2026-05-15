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
