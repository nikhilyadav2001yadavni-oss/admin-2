# Winvest Admin Panel

A modern, comprehensive admin panel for managing the Winvest platform. Built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- Dashboard with real-time statistics
- User Management
- Financial Management (Deposits, Withdrawals, Transactions, Wallets)
- Gaming Management with Game Settings
- ROI Management
- MLM & Referrals
- Reports & Analytics
- System Settings
- Admin Users Management

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Axios
- Lucide React Icons

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create .env.local file:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

3. Run development server:
```bash
npm run dev
```

4. Open http://localhost:3000

## Default Login

- Email: admin@winvest.com
- Password: admin123

## Project Structure

- app/ - Next.js pages
- components/ - Reusable components
- lib/ - Utilities and API client
- types/ - TypeScript definitions


## Mobile & Responsive Design

The admin panel is fully responsive and mobile-friendly:

- **Mobile Navigation**: Hamburger menu with slide-out sidebar
- **Touch-Friendly**: All buttons and interactive elements optimized for touch
- **Adaptive Layouts**: Components adjust seamlessly across all screen sizes
- **Responsive Tables**: Horizontal scroll on mobile with optimized spacing
- **Mobile Modals**: Full-screen friendly with stacked buttons
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)

See RESPONSIVE_FEATURES.md for detailed documentation.

