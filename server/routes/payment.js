const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const users = require('../services/userStore');
const paymentStore = require('../services/paymentStore');

const plans = {
  monthly: { id: 'monthly', name: 'Monthly', amount: 5, currency: 'USD', durationDays: 30 },
  lifetime: { id: 'lifetime', name: 'Lifetime', amount: 20, currency: 'USD', durationDays: null }
};
function apiBase() {
  return (process.env.API_BASE_URL || '').replace(/\/$/, '');
}
function clientBase() {
  return (process.env.CLIENT_URL || '').replace(/\/$/, '');
}
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
async function verifyTransaction(transactionId, txRef) {
  if (!process.env.FLW_SECRET_KEY) throw new Error('Flutterwave is not configured');
  const response = await fetch('https://api.flutterwave.com/v3/transactions/' + encodeURIComponent(String(transactionId)) + '/verify', {
    headers: { Authorization: 'Bearer ' + process.env.FLW_SECRET_KEY, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status !== 'success' || !body.data) throw new Error('Flutterwave transaction verification failed');
  const tx = body.data;
  const order = paymentStore.get(txRef);
  if (!order) throw new Error('Payment reference not found');
  if (tx.tx_ref !== txRef) throw new Error('Flutterwave transaction reference mismatch');
  if (tx.status !== 'successful' || tx.currency !== order.currency || Number(tx.amount) < order.amount) {
    paymentStore.markFailed(txRef);
    throw new Error('Payment amount, currency or status did not match');
  }
  paymentStore.markPaid(txRef, tx.id, tx.amount);
  return order;
}

router.get('/config', (req, res) => {
  res.json({ success: true, plans: Object.values(plans) });
});

router.get('/entitlement', authenticate, (req, res) => {
  res.json({ success: true, entitlement: paymentStore.getEntitlement(req.user.id) });
});

router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    const plan = plans[req.body?.plan];
    if (!plan) return res.status(400).json({ success: false, error: 'Choose monthly or lifetime plan' });
    if (!process.env.FLW_SECRET_KEY || !apiBase() || !clientBase()) {
      return res.status(503).json({ success: false, error: 'Flutterwave payment settings are incomplete' });
    }
    try {
      if (new URL(apiBase()).protocol !== 'https:' || new URL(clientBase()).protocol !== 'https:') throw new Error();
    } catch {
      return res.status(503).json({ success: false, error: 'API_BASE_URL and CLIENT_URL must be valid HTTPS URLs' });
    }
    const user = users.findById(req.user.id);
    if (!user) return res.status(401).json({ success: false, error: 'Account not found' });
    const txRef = 'repo2apk_' + crypto.randomUUID();
    const order = paymentStore.create({
      txRef, userId: user.id, plan: plan.id, amount: plan.amount, currency: plan.currency, status: 'pending',
      createdAt: new Date().toISOString(), transactionId: null
    });
    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.FLW_SECRET_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: String(plan.amount),
        currency: plan.currency,
        redirect_url: apiBase() + '/api/payment/callback',
        customer: { email: user.email },
        customizations: { title: 'Repo2APK', description: plan.name + ' plan' },
        meta: { userId: user.id, product: 'subscription', plan: plan.id },
        configurations: { session_duration: 20, max_retry_attempt: 3 }
      }),
      signal: AbortSignal.timeout(15000)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.status !== 'success' || !body.data?.link) {
      paymentStore.markFailed(txRef);
      return res.status(502).json({ success: false, error: 'Could not create Flutterwave checkout' });
    }
    res.json({ success: true, txRef: order.txRef, checkoutUrl: body.data.link });
  } catch (error) { next(error); }
});

router.get('/callback', async (req, res) => {
  const txRef = String(req.query.tx_ref || '');
  const transactionId = String(req.query.transaction_id || '');
  const status = String(req.query.status || '');
  if (!txRef || !transactionId || status !== 'successful') {
    if (txRef) paymentStore.markFailed(txRef);
    return res.redirect(clientBase() + '/?payment=failed');
  }
  try {
    await verifyTransaction(transactionId, txRef);
    return res.redirect(clientBase() + '/?payment=success');
  } catch {
    return res.redirect(clientBase() + '/?payment=failed');
  }
});

router.post('/webhook', async (req, res) => {
  const secretHash = process.env.FLW_SECRET_HASH;
  const signature = req.get('verif-hash');
  if (!secretHash || !safeEqual(signature, secretHash)) return res.status(401).end();
  const data = req.body?.data;
  if (req.body?.event !== 'charge.completed' || !data?.id || !data?.tx_ref) return res.status(200).end();
  try { await verifyTransaction(data.id, String(data.tx_ref)); }
  catch (error) { console.error('Flutterwave webhook verification:', error.message); }
  return res.status(200).end();
});

module.exports = router;
