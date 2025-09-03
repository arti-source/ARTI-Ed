'use server'

import { stripe } from '@/lib/stripe'
import { headers } from 'next/headers'

interface CheckoutData {
  priceId: string
  quantity: number
  customerEmail: string
  userId: string
  planId: string
  planType: string
  customerName: string
  companyName?: string
}

export async function createCheckoutSession(data: CheckoutData) {
  try {
    const headersList = headers()
    const origin = headersList.get('origin') || 'https://arti-ed.vercel.app'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: data.customerEmail,
      client_reference_id: data.userId,
      line_items: [
        {
          price: data.priceId,
          quantity: data.quantity
        }
      ],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      metadata: {
        userId: data.userId,
        planId: data.planId,
        planType: data.planType,
        customerName: data.customerName,
        companyName: data.companyName || '',
        quantity: data.quantity.toString()
      },
      subscription_data: {
        metadata: {
          userId: data.userId,
          planId: data.planId,
          planType: data.planType,
          customerName: data.customerName,
          companyName: data.companyName || ''
        }
      }
    })

    return { 
      success: true,
      sessionId: session.id,
      url: session.url 
    }
  } catch (error) {
    console.error('Stripe session creation error:', error)
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}