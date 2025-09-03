import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      priceId,
      quantity = 1,
      customerEmail,
      userId,
      planId,
      planType,
      customerName,
      companyName
    } = req.body;

    // Validate required fields
    if (!priceId || !customerEmail || !userId || !planId) {
      return res.status(400).json({ 
        message: 'Missing required fields: priceId, customerEmail, userId, planId' 
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: customerEmail,
      client_reference_id: userId,
      line_items: [
        {
          price: priceId,
          quantity: parseInt(quantity)
        }
      ],
      success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/checkout.html`,
      metadata: {
        userId: userId,
        planId: planId,
        planType: planType,
        customerName: customerName || '',
        companyName: companyName || '',
        quantity: quantity.toString()
      },
      subscription_data: {
        metadata: {
          userId: userId,
          planId: planId,
          planType: planType,
          customerName: customerName || '',
          companyName: companyName || ''
        }
      }
    });

    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Stripe session creation error:', error);
    return res.status(500).json({ 
      message: 'Error creating checkout session',
      error: error.message 
    });
  }
}