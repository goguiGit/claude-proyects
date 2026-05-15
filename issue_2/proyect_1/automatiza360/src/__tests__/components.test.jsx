import { render, screen } from '@testing-library/react'
import { CONTENT } from '../constants/content'

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
