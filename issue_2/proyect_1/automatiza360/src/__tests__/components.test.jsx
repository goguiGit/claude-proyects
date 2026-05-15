import { render, screen } from '@testing-library/react'
import { CONTENT } from '../constants/content'
import Navbar from '../components/Navbar'

test('CONTENT has required top-level keys', () => {
  expect(CONTENT).toHaveProperty('hero')
  expect(CONTENT).toHaveProperty('credibility')
  expect(CONTENT).toHaveProperty('problems')
  expect(CONTENT).toHaveProperty('benefits')
  expect(CONTENT).toHaveProperty('howItWorks')
  expect(CONTENT).toHaveProperty('useCases')
  expect(CONTENT).toHaveProperty('testimonials')
  expect(CONTENT).toHaveProperty('faq')
  expect(CONTENT).toHaveProperty('finalCta')
  expect(CONTENT).toHaveProperty('footer')
})

test('Navbar renders logo and CTA', () => {
  render(<Navbar />)
  expect(screen.getByText(/Automatiza/)).toBeInTheDocument()
  expect(screen.getByText(/Reserva una llamada/)).toBeInTheDocument()
})

import Hero from '../components/Hero'

test('Hero renders headline and CTA buttons', () => {
  render(<Hero />)
  expect(screen.getByText(/Tu negocio vendiendo/)).toBeInTheDocument()
  expect(screen.getByText(/Reserva tu llamada gratis/)).toBeInTheDocument()
  expect(screen.getByText(/Ver cómo funciona/)).toBeInTheDocument()
})

test('HeroVisual renders Antes/Después labels', () => {
  render(<Hero />)
  expect(screen.getAllByText(/Antes/).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/Después/).length).toBeGreaterThan(0)
})

import Credibility from '../components/Credibility'
import Problems from '../components/Problems'
import Benefits from '../components/Benefits'

test('Credibility renders 4 metrics', () => {
  render(<Credibility />)
  expect(screen.getByText('+80')).toBeInTheDocument()
  expect(screen.getByText('3.2x')).toBeInTheDocument()
})

test('Problems renders pain point cards', () => {
  render(<Problems />)
  expect(screen.getByText(/Te suena alguno/)).toBeInTheDocument()
  expect(screen.getByText(/Leads que se enfrían/)).toBeInTheDocument()
})

test('Benefits renders 6 benefit cards', () => {
  render(<Benefits />)
  expect(screen.getAllByRole('article')).toHaveLength(6)
})

import HowItWorks from '../components/HowItWorks'
import UseCases from '../components/UseCases'

test('HowItWorks renders 3 steps', () => {
  render(<HowItWorks />)
  expect(screen.getByText('Diagnóstico gratuito')).toBeInTheDocument()
  expect(screen.getByText('Diseño e implementación')).toBeInTheDocument()
  expect(screen.getByText(/piloto automático/)).toBeInTheDocument()
})

test('UseCases renders use case cards', () => {
  render(<UseCases />)
  expect(screen.getByText('Captación de leads')).toBeInTheDocument()
  expect(screen.getByText('Agendado automático')).toBeInTheDocument()
})

import Testimonials from '../components/Testimonials'
import FAQ from '../components/FAQ'
import FinalCTA from '../components/FinalCTA'
import Footer from '../components/Footer'

test('Testimonials renders 3 quotes', () => {
  render(<Testimonials />)
  expect(screen.getByText(/recuperamos lo invertido/)).toBeInTheDocument()
  expect(screen.getByText(/María G\./)).toBeInTheDocument()
})

test('FAQ renders all questions', () => {
  render(<FAQ />)
  expect(screen.getByText(/Cuánto tiempo tarda/)).toBeInTheDocument()
  expect(screen.getByText(/cambiar mis herramientas/)).toBeInTheDocument()
})

test('FinalCTA renders main CTA button', () => {
  render(<FinalCTA />)
  expect(screen.getAllByText(/diagnóstico gratuito/i)[0]).toBeInTheDocument()
})

test('Footer renders logo and copyright', () => {
  render(<Footer />)
  expect(screen.getAllByText(/Automatiza/)[0]).toBeInTheDocument()
  expect(screen.getByText(/2025/)).toBeInTheDocument()
})

import App from '../App'

test('App renders all major sections', () => {
  render(<App />)
  expect(screen.getByText(/Tu negocio vendiendo/)).toBeInTheDocument()
  expect(screen.getAllByText(/Cómo funciona/i)[0]).toBeInTheDocument()
  expect(screen.getByText(/Lo que dicen/)).toBeInTheDocument()
})
