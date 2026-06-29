# Lobby Y2K 👟

> Premium sneaker e-commerce — Y2K chrome aesthetic meets luxury streetwear UX.

A production-ready, full-stack sneaker store built with **HTML5 · CSS3 · Vanilla JS (ES Modules) · Supabase · PostgreSQL**.

## Legal Notice

This repository is protected. Unauthorized reproduction, redistribution,
or use of this code will result in DMCA takedown requests.

## ✦ Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | HTML5, CSS3, Vanilla JS ES Modules  |
| Backend     | Supabase (PostgreSQL + Auth + Storage) |
| Auth        | Supabase Auth (Email + Password)    |
| Payments    | Stripe Checkout                     |
| Deployment  | Netlify (static hosting)            |
| Fonts       | Space Grotesk · DM Sans · JetBrains Mono |

---

## ✦ Project Structure

```
lobby-y2k/
├── index.html                 ← Home page
├── netlify.toml               ← Netlify deployment config
├── css/
│   └── main.css               ← Full design system (1200+ lines)
├── js/
│   ├── env.js                 ← Supabase URL + Anon Key
│   ├── supabase.js            ← Supabase client
│   ├── services/
│   │   ├── auth.js            ← Auth service
│   │   ├── products.js        ← Products service
│   │   ├── cart.js            ← Cart service
│   │   ├── orders.js          ← Orders + checkout service
│   │   └── misc.js            ← Wishlist · Messages · Profiles
│   └── utils/
│       ├── helpers.js         ← Toast · format · productCard · skeletons
│       └── page-shell.js      ← Nav · theme · auth state (shared)
├── pages/
│   ├── login.html             ← Sign In
│   ├── signup.html            ← Create Account (with username)
│   ├── forgot-password.html   ← Reset password flow
│   ├── search.html            ← Shop / Search / Filter
│   ├── product.html           ← Product detail + gallery + reviews
│   ├── cart.html              ← Shopping cart
│   ├── checkout.html          ← Address + order placement
│   ├── order-confirmation.html← Post-checkout success
│   ├── orders.html            ← Order history
│   ├── order-detail.html      ← Single order view
│   ├── wishlist.html          ← Saved products
│   ├── profile.html           ← Account + edit profile
│   ├── messages.html          ← User messages inbox
│   ├── admin.html             ← Admin dashboard (full)
│   └── 404.html               ← Not found page
└── sql/
    └── migrations.sql         ← Full DB schema + RLS + seed data
```
# ⚠️ Usage Notice

This project is protected under copyright law.

❌ You are NOT allowed to:
- Copy or redistribute this code
- Use it in commercial or personal projects
- Modify and claim it as your own

✔️ You may:
- View the code for learning purposes only

Any unauthorized use is strictly prohibited.
