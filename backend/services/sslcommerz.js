const crypto = require('crypto');

const isLive = () => process.env.SSLCOMMERZ_IS_LIVE === 'true';
const gatewayBaseUrl = () =>
  isLive() ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com';

const isConfigured = () => {
  if (!process.env.SSLCOMMERZ_STORE_ID || !process.env.SSLCOMMERZ_STORE_PASSWORD) {
    return false;
  }
  try {
    const callbackUrl = new URL(process.env.BACKEND_PUBLIC_URL);
    return callbackUrl.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(callbackUrl.hostname);
  } catch {
    return false;
  }
};

const createTransactionId = () =>
  `PF${Date.now().toString(36)}${crypto.randomBytes(5).toString('hex')}`;

async function readJsonResponse(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('SSLCommerz returned an unreadable response.');
  }
  if (!response.ok) throw new Error('SSLCommerz request failed.');
  return payload;
}

async function createPaymentSession(order, transactionId) {
  if (!isConfigured()) {
    throw new Error('SSLCommerz is not configured. Add merchant credentials to the backend environment.');
  }

  const backendUrl = (process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');
  const form = new URLSearchParams({
    store_id: process.env.SSLCOMMERZ_STORE_ID,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
    total_amount: Number(order.totalAmount).toFixed(2),
    currency: 'BDT',
    tran_id: transactionId,
    success_url: `${backendUrl}/api/payments/sslcommerz/success`,
    fail_url: `${backendUrl}/api/payments/sslcommerz/fail`,
    cancel_url: `${backendUrl}/api/payments/sslcommerz/cancel`,
    ipn_url: `${backendUrl}/api/payments/sslcommerz/ipn`,
    cus_name: order.customerName.slice(0, 50),
    cus_email: order.customerEmail,
    cus_add1: order.address.slice(0, 50),
    cus_city: 'Dhaka',
    cus_postcode: '1000',
    cus_country: 'Bangladesh',
    cus_phone: order.phone.slice(0, 20),
    shipping_method: 'NO',
    num_of_item: String(order.items.reduce((sum, item) => sum + item.quantity, 0)),
    product_name: order.items.map((item) => item.name).join(', ').slice(0, 255),
    product_category: 'Fruits',
    product_profile: 'physical-goods',
    value_a: String(order._id),
  });

  const response = await fetch(`${gatewayBaseUrl()}/gwprocess/v4/api.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    signal: AbortSignal.timeout(15000),
  });
  const payload = await readJsonResponse(response);
  if (payload.status !== 'SUCCESS' || !payload.GatewayPageURL) {
    throw new Error(payload.failedreason || 'SSLCommerz could not create a payment session.');
  }

  const gatewayUrl = new URL(payload.GatewayPageURL);
  const allowedHosts = new Set(['sandbox.sslcommerz.com', 'securepay.sslcommerz.com']);
  if (gatewayUrl.protocol !== 'https:' || !allowedHosts.has(gatewayUrl.hostname)) {
    throw new Error('SSLCommerz returned an unexpected payment URL.');
  }
  return gatewayUrl.toString();
}

async function validatePayment(validationId) {
  if (!isConfigured()) throw new Error('SSLCommerz is not configured.');

  const validationUrl = new URL(`${gatewayBaseUrl()}/validator/api/validationserverAPI.php`);
  validationUrl.search = new URLSearchParams({
    val_id: validationId,
    store_id: process.env.SSLCOMMERZ_STORE_ID,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
    format: 'json',
  });

  const response = await fetch(validationUrl, {
    signal: AbortSignal.timeout(15000),
  });
  return readJsonResponse(response);
}

module.exports = {
  createPaymentSession,
  createTransactionId,
  isConfigured,
  validatePayment,
};
