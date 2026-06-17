# الربط الذكي | Smart Menu

نظام منيو ذكي مع إدارة الطلبات عبر واتساب للمطاعم والمقاهي.
Smart menu and order management system with WhatsApp integration for restaurants and cafes.

---

## التقنيات المستخدمة | Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (via Prisma ORM + libSQL)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui + Base UI
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Notifications**: Sonner

## المميزات | Features

- قائمة طعام رقمية تفاعلية | Interactive digital menu
- إدارة الفئات والمنتجات | Category and product management
- نظام الطلبات مع حالات مختلفة | Order system with status tracking
- إرسال الطلبات عبر واتساب | WhatsApp order integration
- لوحة تحكم للمشرفين | Admin dashboard
- دعم كامل للغة العربية | Full Arabic language support
- تصميم متجاوب | Responsive design

## المتطلبات | Prerequisites

- **Node.js** 18+
- **npm** 9+

## التثبيت | Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd smart-menu

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env

# 4. Generate Prisma client
npx prisma generate

# 5. Run database migrations
npx prisma migrate dev --name init

# 6. Seed the database
npx prisma db seed

# 7. Start development server
npm run dev
```

## الإعدادات | Environment Setup

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./prisma/dev.db"
```

## قاعدة البيانات | Database

This project uses Prisma ORM with SQLite via libSQL adapter.

### إنشاء البيانات الافتراضية | Seed Data

The seed command creates:

- **Admin** account (username: `admin`, password: `admin123`)
- **Restaurant**: مقهى الواحة / Al Waha Cafe
- **4 categories** with 16 menu items
- **Settings** for the restaurant
- **3 sample orders** with different statuses
- **WhatsApp template**

To run the seed:

```bash
npx prisma db seed
```

Or directly:

```bash
npx tsx prisma/seed.ts
```

## تشغيل المشروع | Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## دليل الاستخدام | Usage Guide

### تسجيل الدخول | Login
1. Navigate to `/login`
2. Use default credentials: `admin` / `admin123`
3. You will be redirected to the dashboard

### إدارة القائمة | Menu Management
- Add/edit/remove categories and items
- Set prices, descriptions, and images
- Control item availability status

### إدارة الطلبات | Order Management
- View incoming orders in real-time
- Update order status (new → preparing → ready → completed)
- Send order details via WhatsApp

### الإعدادات | Settings
- Configure restaurant info
- Set working hours
- Customize WhatsApp message template
- Manage tax and currency settings

## هيكل المشروع | Project Structure

```
smart-menu/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
├── public/                    # Static assets
├── src/
│   ├── app/
│   │   ├── api/auth/login/    # Auth API route
│   │   ├── login/             # Login page
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/ui/         # shadcn/ui components
│   ├── generated/prisma/      # Prisma client (auto-generated)
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   └── utils.ts           # Utility functions
│   ├── store/
│   │   └── cart.ts            # Zustand cart store
│   └── proxy.ts               # Auth proxy (middleware)
├── .env                       # Environment variables
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

## نقاط النهاية API | API Endpoints

| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| POST   | `/api/auth/login`     | Admin login              |
| GET    | `/api/menu`           | Get menu items           |
| GET    | `/api/categories`     | Get categories           |
| POST   | `/api/orders`         | Create order             |
| GET    | `/api/orders`         | List orders              |
| GET    | `/api/orders/[id]`    | Get order details        |

## بيانات الدخول الافتراضية | Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

> **تغيير كلمة المرور مهم | Important**: Change the default password in production.

## لقطات الشاشة | Screenshots

*(Screenshots to be added)*

---

## الترخيص | License

MIT
