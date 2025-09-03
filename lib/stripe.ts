import Stripe from 'stripe'

// Client-side Stripe (publishable key)
export const stripePublishableKey = 'pk_live_51PFzIJFk08c0mcLVPEPQOmVVQFzgyo5hywXLfaRQO4Oefsi0VhbzUfVHlgjPD14gCTgIgKpZZsFfEY1JzveZoYMF00SZ8tUj8o'

// Server-side Stripe (secret key)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})