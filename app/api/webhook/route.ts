import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', (err as Error).message)
    return NextResponse.json(
      { error: `Webhook Error: ${(err as Error).message}` },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
        
      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: any) {
  console.log('Checkout completed:', session.id)
  
  const {
    client_reference_id: userId,
    customer: customerId,
    subscription: subscriptionId,
    metadata
  } = session

  if (!userId || !subscriptionId) {
    console.error('Missing userId or subscriptionId in checkout session')
    return
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  
  // Create subscription record in Supabase
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_id: metadata.planId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      status: 'active',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'stripe_subscription_id'
    })

  if (error) {
    console.error('Error creating subscription:', error)
    return
  }

  // If team plan, create team membership for admin
  if (metadata.planType === 'team') {
    await createTeamMembership(subscriptionId, userId, 'admin')
  }

  console.log('Subscription created successfully for user:', userId)
}

async function handleSubscriptionCreated(subscription: any) {
  console.log('Subscription created:', subscription.id)
  
  // Update subscription status in database
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription:', error)
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('Subscription updated:', subscription.id)
  
  // Update subscription in database
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription:', error)
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('Subscription deleted:', subscription.id)
  
  // Update subscription status to canceled
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error canceling subscription:', error)
  }
}

async function handlePaymentSucceeded(invoice: any) {
  console.log('Payment succeeded for subscription:', invoice.subscription)
  
  // Ensure subscription is active
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', invoice.subscription)

  if (error) {
    console.error('Error updating subscription after payment:', error)
  }
}

async function handlePaymentFailed(invoice: any) {
  console.log('Payment failed for subscription:', invoice.subscription)
  
  // Update subscription status
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', invoice.subscription)

  if (error) {
    console.error('Error updating subscription after failed payment:', error)
  }
}

async function createTeamMembership(subscriptionId: string, userId: string, role = 'admin') {
  // Get subscription data to link team membership
  const { data: subscription, error: subError } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (subError || !subscription) {
    console.error('Could not find subscription for team membership:', subError)
    return
  }

  // Create team membership
  const { error } = await supabaseAdmin
    .from('team_memberships')
    .upsert({
      subscription_id: subscription.id,
      user_id: userId,
      role: role,
      status: 'active'
    }, {
      onConflict: 'subscription_id,user_id'
    })

  if (error) {
    console.error('Error creating team membership:', error)
  } else {
    console.log('Team membership created for user:', userId)
  }
}