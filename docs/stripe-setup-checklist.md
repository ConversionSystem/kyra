# Stripe Setup Checklist
*New Price IDs needed for Solo Pro, Voice Add-on, and Annual Plans*

---

## Step 1 — Create Products & Prices in Stripe

Go to: **dashboard.stripe.com → Products → + Add product**

Create the following. For each, copy the **Price ID** (starts with `price_...`).

### Solo Pro — $39/month

| Field | Value |
|-------|-------|
| Product name | Kyra Solo Pro |
| Price | $39.00 |
| Billing period | Monthly |
| → Price ID | `STRIPE_SOLO_PRO_PRICE_ID` |

Add a second price to the **same product**:

| Field | Value |
|-------|-------|
| Price | $348.00 |
| Billing period | Yearly ($29/mo × 12) |
| → Price ID | `STRIPE_SOLO_PRO_ANNUAL_PRICE_ID` |

---

### Lite Annual — $948/year (=$79/mo)

Add a second price to the **existing Lite/Starter product**:

| Field | Value |
|-------|-------|
| Price | $948.00 |
| Billing period | Yearly |
| → Price ID | `STRIPE_STARTER_ANNUAL_PRICE_ID` |

---

### Pro Annual — $2,388/year (=$199/mo)

Add a second price to the **existing Pro product**:

| Field | Value |
|-------|-------|
| Price | $2,388.00 |
| Billing period | Yearly |
| → Price ID | `STRIPE_PRO_ANNUAL_PRICE_ID` |

---

### Scale Annual — $4,788/year (=$399/mo)

Add a second price to the **existing Scale product**:

| Field | Value |
|-------|-------|
| Price | $4,788.00 |
| Billing period | Yearly |
| → Price ID | `STRIPE_SCALE_ANNUAL_PRICE_ID` |

---

### Voice AI Add-on — $79/month

| Field | Value |
|-------|-------|
| Product name | Kyra Voice AI Add-on |
| Price | $79.00 |
| Billing period | Monthly |
| → Price ID | `STRIPE_VOICE_ADDON_PRICE_ID` |

Add a second price to the **same product**:

| Field | Value |
|-------|-------|
| Price | $756.00 |
| Billing period | Yearly |
| → Price ID | `STRIPE_VOICE_ADDON_ANNUAL_PRICE_ID` |

---

## Step 2 — Add to Vercel Environment Variables

Go to: **vercel.com → kyra project → Settings → Environment Variables**

Add each of the following (all environments: Production, Preview, Development):

```
STRIPE_SOLO_PRO_PRICE_ID=price_...
STRIPE_SOLO_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_STARTER_ANNUAL_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_SCALE_ANNUAL_PRICE_ID=price_...
STRIPE_VOICE_ADDON_PRICE_ID=price_...
STRIPE_VOICE_ADDON_ANNUAL_PRICE_ID=price_...
```

---

## Step 3 — Redeploy

After adding env vars, trigger a redeploy:

```bash
vercel --prod
```

Or push any commit to main — Vercel auto-deploys.

---

## Step 4 — Test

1. Go to kyra.conversionsystem.com/agency/billing
2. Click "Upgrade to Solo Pro" → should open Stripe Checkout at $39/mo
3. Toggle "Annual" → Solo Pro price should show $29/mo ($348/yr)
4. Click "Add Voice AI" → should open Stripe Checkout at $79/mo
5. Check /pricing — Solo Pro should appear as first plan

---

*Created: March 7, 2026*
