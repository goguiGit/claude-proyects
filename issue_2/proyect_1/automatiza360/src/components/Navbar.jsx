import { useState, useEffect } from 'react'
import { CONTENT } from '../constants/content'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { nav } = CONTENT

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-bg-primary/90 backdrop-blur-md border-b border-accent-blue/10' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="#" className="text-xl font-extrabold tracking-tight">
          <span className="text-slate-100">Automatiza</span>
          <span className="text-accent-cyan">360</span>
        </a>

        <ul className="hidden md:flex items-center gap-8">
          {nav.links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm text-slate-400 hover:text-slate-100 transition-colors">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <a href="#contacto" className="hidden md:inline-flex btn-primary text-sm">
          {nav.cta}
        </a>

        <button
          className="md:hidden text-slate-400 hover:text-slate-100 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {menuOpen && (
        <div className="md:hidden bg-bg-card border-t border-accent-blue/10 px-4 py-6 flex flex-col gap-4">
          {nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-slate-300 hover:text-slate-100 transition-colors text-sm"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a href="#contacto" className="btn-primary text-sm text-center mt-2">
            {nav.cta}
          </a>
        </div>
      )}
    </header>
  )
}
