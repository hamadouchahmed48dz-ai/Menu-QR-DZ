# MenuQR — Production Deployment & Operations Guide

Welcome to the production deployment guide for **MenuQR**, a digital restaurant menu and table ordering system built with React 19, TypeScript, Tailwind CSS, and Supabase.

---

## 1. Architecture Overview

MenuQR is designed as a secure, multi-tenant SaaS application:
- **Client Application**: Fast React + Vite Single Page Application (SPA), mobile-optimized for table dining and desktop-ready for the restaurant kitchen Kanban dashboard.
- **Backend & Database**: Supabase PostgreSQL with Row Level Security (RLS) guaranteeing strict tenant data isolation by `restaurant_id`.
- **Real-Time Engine**: Supabase Realtime (PostgreSQL CDC) delivering instant ticket updates and waiter alerts to kitchen dashboards without polling.
- **Audio Feedback**: Native Web Audio API synthesizing chimes (C5-E5-G5 kitchen chime and C6 waiter bell) with zero external audio assets.
- **QR Code Generation**: Dynamic client-side SVG and high-resolution 1200×1600 canvas PNG generator powered by the `qrcode` library.
- **Storage**: Supabase Storage for menu dishes and restaurant branding.

---

## 2. Prerequisites

Before starting, ensure you have:
1. A **Supabase** account ([supabase.com](https://supabase.com))
2. A deployment platform account (such as **Vercel**, **Netlify**, or **Google Cloud Run**)
3. Node.js 20+ and npm installed locally (if building locally)

---

## 3. Supabase Project Setup

### Step 3.1: Create a Supabase Project
1. Go to the [Supabase Dashboard](https://database.new) and click **New Project**.
2. Name your project (e.g. `menuqr-production`).
3. Set a strong database password and select a region close to your primary restaurant market.

### Step 3.2: Run the PostgreSQL Schema Migration
1. In the Supabase Dashboard, open the **SQL Editor** from the left navigation.
2. Click **New Query**.
3. Copy the entire contents of `src/db/schema.sql` from this repository and paste it into the editor.
4. Click **Run**.
5. This creates:
   - 9 core tables (`restaurants`, `profiles`, `categories`, `products`, `tables`, `orders`, `order_items`, `offers`, `waiter_requests`).
   - Indexes for fast slug, status, and tenant querying.
   - Row Level Security (RLS) policies enforcing `admin` vs `staff` role boundaries.
   - Realtime publication `supabase_realtime` for `orders`, `order_items`, and `waiter_requests`.
   - Public storage buckets `restaurant-assets` and `product-images`.
   - Seed data for a sample restaurant (`Younes Restaurant`).

### Step 3.3: Verify Realtime Replication
1. In the Supabase Dashboard, navigate to **Database** → **Replication**.
2. Verify that the `supabase_realtime` publication includes:
   - `public.orders`
   - `public.order_items`
   - `public.waiter_requests`
3. If not already toggled, enable replication for these three tables.

### Step 3.4: Configure Authentication Settings
1. Navigate to **Authentication** → **URL Configuration**.
2. Set **Site URL** to your production domain:
   ```
   https://menuqr.yourdomain.com
   ```
3. Add the following to **Redirect URLs**:
   ```
   https://menuqr.yourdomain.com/**
   http://localhost:3000/**
   ```
4. (Optional) In **Authentication** → **Email Templates**, customize confirmation emails to feature your restaurant branding.

---

## 4. Environment Variables

Create your production environment variables. In your deployment platform (Vercel, Netlify, or Cloud Run):

| Variable Name | Description | Example |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase Project API URL | `https://xyzproject.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public anonymous client API key | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |

> ⚠️ **CRITICAL SECURITY RULE**: Never expose or configure `SUPABASE_SERVICE_ROLE_KEY` on the client or in frontend repository secrets. The client SPA exclusively uses the anonymous key (`VITE_SUPABASE_ANON_KEY`), relying on PostgreSQL Row Level Security (RLS) to enforce data boundaries.

---

## 5. Deployment Options

### Option A: Vercel (Recommended)
1. Push your repository to GitHub or GitLab.
2. In Vercel, click **Add New** → **Project** and import the repository.
3. Select the **Vite** framework preset.
4. Configure Build & Output Settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Create or verify `vercel.json` for SPA client-side routing rewrites:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
7. Click **Deploy**.

### Option B: Netlify
1. Connect repository in Netlify.
2. Set build command: `npm run build` and publish directory: `dist`.
3. Add a `_redirects` file or `netlify.toml`:
   ```toml
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```
4. Set environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Deploy site.

### Option C: Docker / Node.js Host
A production `Dockerfile` can serve the prebuilt static files using Nginx or Node:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 6. Table QR Code System & Printing

### URL Format
Each table's QR code routes to:
```
https://menuqr.yourdomain.com/menu?table={TABLE_NUMBER}
```
Example: `https://menuqr.yourdomain.com/menu?table=5`

### Generating & Printing Table Stands
1. Sign in to the Admin Dashboard (`/admin`).
2. Navigate to **QR Codes** or **Tables**.
3. You can:
   - **Download PNG**: Generates a 1200×1600 px high-resolution table stand card with restaurant logo, table number, and instructions.
   - **Download All PNGs**: Automatically downloads all table cards sequentially.
   - **Print Card (A4)**: Renders a print-ready layout formatted for standard A4 paper or acrylic table tents.
   - **Print All Sheet**: Prints all active tables in a multi-card grid.

### Printing Specifications for Real Restaurants
- **Paper Stock**: 250gsm to 350gsm coated cardstock with matte lamination (water/grease resistant).
- **Physical Stands**: Double-sided vertical acrylic tent stands (A6 or 10×15 cm format).
- **Placement**: Place at the center or edge of each numbered dining table.

---

## 7. Multi-Tenant Restaurant Onboarding

### Creating a New Restaurant Account
1. Open the application and go to `/admin`.
2. Click **Create Restaurant Account**.
3. Enter:
   - Restaurant Name (e.g. *Bistro Didouche*)
   - Manager Full Name
   - Email and Password
4. Supabase automatically:
   - Provisions an isolated row in `restaurants` with a unique slug.
   - Creates a user in `auth.users`.
   - Links the user with `admin` role in `profiles`.
   - Grants exclusive RLS read/write access to that restaurant's records.

### Roles & Access Control
- **`admin`**: Full control over menu items, categories, dining tables, QR codes, business details, currency, and opening hours.
- **`staff`**: Operational access to the live kitchen Kanban board, order status progression, and waiter calls. Restricted from altering restaurant settings or deleting catalog items.

---

## 8. Post-Deployment Verification Checklist

- [ ] Open `/menu?table=1` on a mobile device and verify that Table 1 badge is displayed.
- [ ] Add dishes with sizes and extras to the cart and place a test order.
- [ ] Open `/admin` on a separate device/tab and verify:
  - The new order appears immediately without refreshing.
  - The kitchen audio chime plays.
  - The new order card pulses with visual highlighting.
- [ ] Test status transitions: `Received` → `Preparing` → `Ready` → `Served`.
- [ ] Call Waiter from the customer menu and verify the notification bell rings on the admin dashboard.
- [ ] Test with an invalid table number (e.g. `/menu?table=9999`) and confirm the dedicated error screen appears.
- [ ] Disconnect internet and verify the `NetworkBanner` notifies the user of offline status.

MenuQR is now ready for production service!
