import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  'https://gfhcsypawnqiokdkduaz.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Webhook signing secret from Stripe Dashboard
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handleCheckoutCompleted(session) {
  console.log('Checkout completed:', session.id);
  
  const {
    client_reference_id: userId,
    customer: customerId,
    subscription: subscriptionId,
    metadata
  } = session;

  if (!userId || !subscriptionId) {
    console.error('Missing userId or subscriptionId in checkout session');
    return;
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Create subscription record in Supabase
  const { error } = await supabase
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
    });

  if (error) {
    console.error('Error creating subscription:', error);
    return;
  }

  // If team plan, create team membership for admin
  if (metadata.planType === 'team') {
    await createTeamMembership(subscriptionId, userId, 'admin');
  }

  console.log('Subscription created successfully for user:', userId);
}

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);
  
  const { metadata } = subscription;
  
  // Update subscription status in database
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);
  
  // Update subscription in database
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  // Update subscription status to canceled
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error canceling subscription:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded for subscription:', invoice.subscription);
  
  // Ensure subscription is active
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', invoice.subscription);

  if (error) {
    console.error('Error updating subscription after payment:', error);
  }
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed for subscription:', invoice.subscription);
  
  // Update subscription status
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', invoice.subscription);

  if (error) {
    console.error('Error updating subscription after failed payment:', error);
  }
}

async function createTeamMembership(subscriptionId, userId, role = 'admin') {
  // Get subscription data to link team membership
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (subError || !subscription) {
    console.error('Could not find subscription for team membership:', subError);
    return;
  }

  // Create team membership
  const { error } = await supabase
    .from('team_memberships')
    .upsert({
      subscription_id: subscription.id,
      user_id: userId,
      role: role,
      status: 'active'
    }, {
      onConflict: 'subscription_id,user_id'
    });

  if (error) {
    console.error('Error creating team membership:', error);
  } else {
    console.log('Team membership created for user:', userId);
  }
}

// Configure for raw body parsing (required for Stripe webhooks)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}