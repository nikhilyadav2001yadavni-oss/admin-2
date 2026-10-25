# Winvest Admin Panel - Routes

## Public Routes
- `/` - Home (redirects to /dashboard or /login)
- `/login` - Admin login page

## Protected Routes (Require Authentication)

### Main Dashboard
- `/dashboard` - Main dashboard with stats and overview

### User Management
- `/users` - User management page
- `/admin-users` - Admin users management

### Financial Management
- `/deposits` - Deposit requests management
- `/withdrawals` - Withdrawal requests management
- `/transactions` - All transactions history
- `/wallets` - Wallet management (add/deduct funds)

### Gaming
- `/gaming` - Gaming management with game settings

### Investment
- `/roi` - ROI plans management
- `/mlm` - MLM levels and referral configuration

### Analytics & Settings
- `/reports` - Reports and analytics
- `/settings` - System settings

## API Endpoints Structure

All API calls are made through the centralized API client in `lib/api.ts`:

- `authAPI` - Authentication endpoints
- `dashboardAPI` - Dashboard data
- `userAPI` - User CRUD operations
- `transactionAPI` - Transaction management
- `gameAPI` - Game data
- `gameConfigAPI` - Game configuration
- `walletAPI` - Wallet operations
- `depositAPI` - Deposit management
- `withdrawalAPI` - Withdrawal management
- `roiAPI` - ROI configuration
- `mlmAPI` - MLM configuration
- `notificationAPI` - Notifications
- `settingsAPI` - System settings
- `adminUserAPI` - Admin user management
- `reportsAPI` - Reports and exports

## Navigation Structure

The sidebar navigation is organized as:
1. Dashboard
2. User Management
3. Deposits
4. Withdrawals
5. Transactions
6. Wallet Management
7. Gaming Management
8. ROI Management
9. MLM & Referrals
10. Reports & Analytics
11. Settings
12. Admin Users

