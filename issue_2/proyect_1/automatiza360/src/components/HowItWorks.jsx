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
