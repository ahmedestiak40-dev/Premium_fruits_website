# Backend setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`.
3. Start MongoDB, then run `npm run dev`.

## SSLCommerz sandbox

1. Create a sandbox merchant account at https://developer.sslcommerz.com/registration/.
2. Copy the sandbox Store ID and Store Password into `SSLCOMMERZ_STORE_ID` and `SSLCOMMERZ_STORE_PASSWORD` in `.env`.
3. Keep `SSLCOMMERZ_IS_LIVE=false` while testing. Never put merchant credentials in frontend environment variables or commit `.env`.
4. Set `BACKEND_PUBLIC_URL` to a public HTTPS URL that forwards to this backend. SSLCommerz must reach the success, fail, cancel, and IPN callbacks; `localhost` alone is not reachable by the gateway.
5. Set `FRONTEND_URL` to the frontend origin. Restart the backend and frontend after changing environment values.
6. Place an order worth between ৳10 and ৳500,000 and choose Online payment. SSLCommerz-hosted checkout will return to `/payment-result` after the backend validates the transaction, currency, and amount.

After sandbox verification, obtain production merchant credentials and use the production Store ID/Password with `SSLCOMMERZ_IS_LIVE=true` and a production HTTPS `BACKEND_PUBLIC_URL`. Do not switch to live mode before merchant approval and callback testing.

## Customer AI assistant

Set `GROQ_API_KEY` in the backend `.env` to enable the customer chat assistant. `GROQ_MODEL` defaults to `qwen/qwen3.8-27b`; `AI_ASSISTANT_BUSINESS_NAME`, `AI_ASSISTANT_TONE`, and optional `AI_ASSISTANT_INSTRUCTIONS` customize its identity, voice, and support rules. These values are only read by the backend and must never be added to frontend environment variables. Create a Groq API key at https://console.groq.com/keys.

The assistant grounds product answers in the current catalog. When the customer is signed in, it can also reference only that account's five latest orders. It cannot modify orders or issue refunds. Without an API key, the chat endpoint stays disabled and returns a setup message. Restart the backend after updating `.env`.