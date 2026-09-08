# GharSe — Ghar ka khana, aapke paas.

A hyperlocal marketplace connecting verified home cooks with students and
working professionals who want affordable, fresh, home-style food — starting
with a single local area around a university/PG community, not a
restaurant-aggregator clone.

## Problem

Students and professionals living away from home want home-cooked food, but
have no easy way to discover home cooks nearby who are selling extra portions
of what they're already making that day.

## Solution

GharSe lets verified home cooks publish a **daily menu** (dish, price,
quantity, ready time) and lets nearby customers discover it, order it, and
either pick it up or get it delivered a short distance — with reviews,
seller verification, and complaint handling built in from day one.

## Core loop

```
Discover → Order → Prepare → Pickup/Delivery → Review
```

## What this MVP validates

1. Students/professionals want affordable home-cooked food.
2. Home cooks are willing to sell extra portions of food they prepare.
3. Customers will place actual orders.
4. Customers use a mix of pickup and short-distance delivery.
5. Customers return to cooks they liked.

Deliberately **not** built yet (see "Future roadmap"): AI recommendations,
live GPS tracking, loyalty/referrals, subscriptions, multi-city, wallets,
native apps, in-app chat, complex coupons, automated payouts.

## Tech stack

| Layer     | Choice                                            |
|-----------|----------------------------------------------------|
| Frontend  | React 18 + Vite + Tailwind CSS, mobile-first       |
| Backend   | Node.js + Express                                  |
| Database  | MongoDB + Mongoose                                 |
| Auth      | Email/phone + password, JWT (7-day expiry)         |
| Images    | Local disk storage via an abstraction (`services/imageStorage.js`) — swap in Cloudinary/S3 later without touching callers |
| Location  | User-entered locality + optional lat/lng; Haversine distance calculation; no external maps API required |
| Payments  | Cash on pickup/delivery or "UPI (marked pending)" — no gateway integration yet, but isolated so Razorpay/Stripe can be added later |

## Architecture

```
gharse/
├── backend/
│   ├── config/db.js            Mongo connection
│   ├── models/                 Mongoose schemas (see below)
│   ├── controllers/            Business logic per resource
│   ├── routes/                 Express routers, wired in server.js
│   ├── middleware/              auth (JWT), role guard, upload, error handler
│   ├── services/imageStorage.js Image storage abstraction
│   ├── utils/                  distance.js, jwt.js, orderNumber.js, seed.js
│   ├── uploads/                 Local image storage (served at /uploads)
│   ├── server.js                Express app entrypoint
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/client.js         Axios instance + JWT header injection
    │   ├── context/AuthContext.jsx
    │   ├── components/           Navbar, FoodCard, StatusStepper, ProtectedRoute
    │   └── pages/                One file per screen (see "UI pages" below)
    └── .env.example
```

## Database models

- **User** — name, email/phone, passwordHash, role (customer/seller/admin), locality, approximateLocation {lat,lng}, foodPreferences
- **SellerProfile** — userId, bio, categories, verificationStatus (pending/verified/rejected), deliveryRadiusKm, pickup/deliveryAvailable, rating, ratingCount, totalOrders
- **FoodListing** — sellerId, name, description, image, price, quantity, remainingQuantity, mealType, date, readyTime, pickup/deliveryAvailable, deliveryRadiusKm, deliveryFee, dietaryType, ingredients, allergens, status (active/soldout/expired/hidden)
- **Order** — orderNumber (GS1000...), customerId, sellerId, items[], subtotal, deliveryFee, total, fulfillmentType, status (placed→accepted→preparing→ready→[out_for_delivery]→completed, or rejected/cancelled), paymentMethod, paymentStatus, platformCommissionPercent/Amount, sellerEarnings (all snapshotted at order time)
- **Review** — customerId, sellerId, orderId (unique — one review per order), rating, comment
- **Complaint** — customerId, orderId, sellerId, category, description, status, resolution
- **PlatformConfig** — singleton doc holding the configurable commission percentage

## API endpoints

```
Auth
  POST   /api/auth/register
  POST   /api/auth/login
  GET    /api/auth/me

Foods
  GET    /api/foods                 (filters: mealType, dietaryType, pickup, delivery,
                                      maxPrice, minRating, sort, lat, lng, maxDistanceKm)
  GET    /api/foods/mine            (seller's own listings)
  GET    /api/foods/:id
  POST   /api/foods                 (seller, multipart image upload)
  PUT    /api/foods/:id
  DELETE /api/foods/:id

Orders
  POST   /api/orders                (customer — atomic overselling-safe stock decrement)
  GET    /api/orders                (role-scoped: customer sees own, seller sees incoming)
  GET    /api/orders/:id
  PUT    /api/orders/:id/status     (seller — enforces valid state transitions)

Sellers
  GET    /api/sellers/:id           (public profile — never exposes exact address)
  GET    /api/sellers/:id/reviews
  GET    /api/sellers/dashboard     (seller's own summary: earnings, commission)
  PUT    /api/sellers/profile
  POST   /api/sellers/verification

Reviews
  POST   /api/reviews               (only for completed orders, one per order)

Complaints
  POST   /api/complaints
  GET    /api/complaints/mine

Admin (all require role=admin)
  GET    /api/admin/stats
  GET    /api/admin/users
  GET    /api/admin/sellers
  PUT    /api/admin/sellers/:id/verify
  GET    /api/admin/listings
  PUT    /api/admin/listings/:id/status
  GET    /api/admin/orders
  GET    /api/admin/complaints
  PUT    /api/admin/complaints/:id
  GET/PUT /api/admin/commission
```

## UI pages

Landing · Login · Customer signup · Seller signup (verification-pending state) ·
Browse (filter + sort) · Food detail (order flow: quantity → pickup/delivery →
payment → confirm) · Order tracking (status stepper, review form, complaint
form) · Order history (current/past) · Public seller profile · Seller
dashboard (today's menu, stats) · Add today's food · Manage orders
(accept/reject/status updates) · Admin dashboard (overview, seller
verification, listings, orders, complaints, commission settings).

## Key business logic

**Overselling prevention** — `orderController.createOrder` uses a single
atomic `findOneAndUpdate` with a `remainingQuantity: { $gte: qty }` guard and
an aggregation-pipeline update, so two concurrent orders racing for the last
portions cannot both succeed. If the guard fails, the customer gets
`Only N portions remaining.`

**Order status transitions** — a `VALID_TRANSITIONS` map rejects invalid
status jumps (e.g. you cannot mark `placed` as `ready` directly). Rejecting
or cancelling automatically restores stock to the listing.

**Reviews** — only allowed for a customer's own order, only once it's
`completed`, and only once per order (unique index). Seller rating is
recalculated as a running average on each new review.

**Privacy/safety** — seller's exact address is never returned by any public
endpoint; only locality and computed distance are exposed. The landing page
and safety copy avoid unsupported claims like "100% safe" or "government
approved."

**Commission** — configurable via the admin dashboard (`PlatformConfig`),
snapshotted onto every order so historical orders keep the commission rate
that applied at the time.

## Installation

### Prerequisites
- Node.js 18+
- A MongoDB instance (local `mongod` or a hosted URI e.g. MongoDB Atlas)

### Backend

```bash
cd backend
cp .env.example .env      # edit MONGO_URI / JWT_SECRET if needed
npm install
npm run seed               # populates demo data (safe to re-run)
npm run dev                 # starts on http://localhost:5000
```

### Frontend

```bash
cd frontend
cp .env.example .env       # points VITE_API_URL at the backend
npm install
npm run dev                 # starts on http://localhost:5173
```

## Environment variables

**backend/.env**
```
MONGO_URI=mongodb://127.0.0.1:27017/gharse
JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=7d
PORT=5000
CLIENT_URL=http://localhost:5173
DEFAULT_COMMISSION_PERCENT=15
# CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET — for a future cloud image provider
```

**frontend/.env**
```
VITE_API_URL=http://localhost:5000/api
```

## Demo accounts

All seeded passwords are `password123`.

| Role   | Login                        | Notes                          |
|--------|-------------------------------|---------------------------------|
| Admin  | admin@gharse.app              | Full admin dashboard            |
| Seller | anita@gharse-demo.app         | Verified, "Anita's Kitchen"     |
| Seller | rekha@gharse-demo.app         | Verified, "Rekha's Rasoi"       |
| Seller | meena@gharse-demo.app         | Verification **pending** — demonstrates that flow |
| Customer | aarav@gharse-demo.app       | Plus 14 more demo customers     |

The seed script also creates 24–30 historical orders across all statuses,
reviews, and a couple of complaints, so the app looks populated for a demo.

## Error handling

A central `errorHandler` middleware converts Mongoose validation/cast errors
and duplicate-key errors into friendly messages, never leaks stack traces to
the client (only logs them server-side outside production), and every
controller returns clear 400/401/403/404/409 responses for invalid login,
expired tokens, sold-out food, invalid quantities, and missing fields.

## Future roadmap

- Real payment gateway integration (Razorpay/UPI intents) behind the existing
  payment-status abstraction
- Cloud image storage (swap `services/imageStorage.js`)
- Google Maps / live geocoding for more accurate distance and delivery zones
- WhatsApp/SMS/push notifications (in-app notifications only for now)
- Automated seller payouts
- FSSAI / local food-safety compliance fields before commercial launch
- Multi-city expansion once the single-area model is validated
