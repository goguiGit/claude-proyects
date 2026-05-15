import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Credibility from './components/Credibility'
import Problems from './components/Problems'
import Benefits from './components/Benefits'
import HowItWorks from './components/HowItWorks'
import UseCases from './components/UseCases'
import Testimonials from './components/Testimonials'
import FAQ from './components/FAQ'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <main>
        <Hero />
        <Credibility />
        <Problems />
        <Benefits />
        <HowItWorks />
        <UseCases />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
