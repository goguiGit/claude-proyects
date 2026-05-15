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
