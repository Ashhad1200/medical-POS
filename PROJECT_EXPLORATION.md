# Medical POS System - Project Exploration

## Overview
This is a comprehensive Point of Sale (POS) system specifically designed for medical stores and pharmacies. It provides real-time inventory management, sales tracking, user management, and multi-role access control.

## Architecture

### Technology Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express.js
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth with JWT
- **State Management**: Redux Toolkit + React Query
- **UI Components**: Headless UI + Heroicons

### Project Structure
```
medical-POS/
├── client/                     # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Main page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API service layers
│   │   ├── store/             # Redux store configuration
│   │   ├── contexts/          # React context providers
│   │   └── utils/             # Utility functions
│   └── public/                # Static assets
├── server/                     # Node.js backend application
│   ├── controllers/           # Route controllers
│   ├── routes/               # API route definitions
│   ├── middleware/           # Express middleware
│   ├── config/               # Configuration files
│   ├── scripts/              # Database scripts and migrations
│   └── utils/                # Server utility functions
```

## Database Schema

The system uses a comprehensive PostgreSQL schema with the following main entities:

### Core Tables
1. **organizations** - Multi-tenant support for different stores
2. **users** - Staff accounts with role-based permissions
3. **medicines** - Product catalog with pricing, stock, and details
4. **orders** - Sales transactions
5. **order_items** - Individual items in orders
6. **suppliers** - Vendor information
7. **customers** - Customer information and history
8. **purchase_orders** - Purchase orders from suppliers
9. **inventory_transactions** - Stock movement tracking
10. **audit_logs** - System activity logging

### Key Relationships
- Organizations have many users, medicines, orders, suppliers
- Orders contain multiple order_items
- Medicines belong to suppliers and organizations
- Users belong to organizations and have specific roles
- Purchase orders track supplier deliveries
- Inventory transactions track all stock movements

## User Roles & Permissions

### 1. Admin Role
- **Full System Access**: Complete control over all features
- **User Management**: Create, edit, delete staff accounts
- **Analytics**: Access to sales reports and dashboards
- **Configuration**: System settings and organization management
- **Financial Reports**: Profit analysis, expense tracking

### 2. Counter Staff Role
- **Sales Processing**: Create and complete sales transactions
- **Customer Service**: Search medicines, process payments
- **Basic Reports**: Daily sales summary
- **Customer Management**: Add/edit customer information
- **Inventory Lookup**: Check stock levels (read-only)

### 3. Warehouse Staff Role
- **Inventory Management**: Update stock levels, manage medicines
- **Supplier Management**: Handle purchase orders
- **Stock Alerts**: Monitor low stock and expiry dates
- **Receiving**: Process incoming inventory
- **Stock Transfers**: Manage inventory movements

## Core Features

### 1. Point of Sale System
- **Quick Medicine Search**: Real-time search with autocomplete
- **Batch Processing**: Handle multiple items in single transaction
- **Payment Methods**: Cash, card, credit support
- **Receipt Generation**: Print/PDF receipts
- **Tax Calculation**: Automatic GST calculation
- **Customer Management**: Track customer purchase history

### 2. Inventory Management
- **Real-time Stock Tracking**: Live inventory updates
- **Low Stock Alerts**: Automated notifications
- **Expiry Date Monitoring**: Track expiring medicines
- **Batch Management**: Handle different batches and expiry dates
- **Reorder Suggestions**: AI-based reorder recommendations
- **Stock Movement History**: Complete audit trail

### 3. Purchase Order System
- **Supplier Management**: Track multiple suppliers
- **Order Creation**: Create purchase orders
- **Receiving Process**: Update inventory on delivery
- **Status Tracking**: Monitor order progress
- **Cost Management**: Track purchase costs and margins

### 4. Analytics & Reporting
- **Sales Dashboard**: Real-time sales metrics
- **Inventory Reports**: Stock levels, movement analysis
- **Financial Reports**: Profit/loss, expense tracking
- **User Activity**: Staff performance monitoring
- **Export Capabilities**: PDF and Excel exports

### 5. User Management
- **Role-based Access**: Granular permission system
- **Staff Accounts**: Create accounts for different roles
- **Activity Logging**: Track user actions
- **Session Management**: Secure login/logout

## API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /login` - User authentication
- `POST /register` - User registration
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `POST /logout` - User logout

### Medicine Routes (`/api/medicines`)
- `GET /` - List all medicines
- `POST /` - Create new medicine
- `GET /:id` - Get medicine details
- `PUT /:id` - Update medicine
- `DELETE /:id` - Delete medicine

### Order Routes (`/api/orders`)
- `GET /` - List orders
- `POST /` - Create new order
- `GET /:id` - Get order details
- `GET /:id/receipt` - Generate receipt
- `GET /dashboard` - Dashboard data
- `GET /sales-chart` - Sales analytics

### Inventory Routes (`/api/inventory`)
- `GET /` - Get inventory items
- `GET /low-stock` - Low stock items
- `GET /expiring` - Expiring items
- `GET /stats` - Inventory statistics
- `PUT /:id` - Update inventory item

### User Routes (`/api/users`) - Admin only
- `GET /` - List users
- `POST /` - Create user
- `GET /:id` - Get user details
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user
- `PATCH /:id/status` - Update user status

## Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **Role-based Permissions**: Granular access control
- **Session Management**: Secure session handling
- **Password Hashing**: bcrypt for password security

### Data Protection
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Proper cross-origin handling
- **Rate Limiting**: API abuse prevention
- **Audit Logging**: Track all system activities

### Infrastructure Security
- **Environment Variables**: Secure configuration management
- **Database Security**: RLS (Row Level Security) with Supabase
- **API Security**: Helmet.js for HTTP headers
- **Error Handling**: Secure error responses

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Git

### Installation Steps
1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd medical-POS
   ```

2. **Install Dependencies**
   ```bash
   # Client
   cd client && npm install
   
   # Server
   cd ../server && npm install
   ```

3. **Environment Configuration**
   - Copy `.env.example` files in both client and server
   - Configure Supabase credentials
   - Set JWT secrets and other configurations

4. **Database Setup**
   ```bash
   cd server
   npm run migrate    # Run database migrations
   npm run seed      # Seed initial data
   ```

5. **Start Development**
   ```bash
   # Terminal 1: Start server
   cd server && npm run dev
   
   # Terminal 2: Start client
   cd client && npm run dev
   ```

### Default Login Credentials
After running the seed script:
- **Admin**: admin / admin123
- **Counter**: counter / counter123  
- **Warehouse**: warehouse / warehouse123

## Deployment

### Production Environment
- **Frontend**: Vercel, Netlify, or similar
- **Backend**: Railway, Heroku, or VPS
- **Database**: Supabase (production instance)
- **File Storage**: AWS S3 or Supabase Storage

### Environment Variables
Ensure all production environment variables are set:
- Supabase production URLs and keys
- JWT secrets
- CORS origins
- Rate limiting configurations

## Monitoring & Maintenance

### Logging
- **Application Logs**: Morgan for HTTP logging
- **Error Tracking**: Console-based error logging
- **Audit Logs**: Database-stored user activity logs

### Backup & Recovery
- **Database Backups**: Supabase automated backups
- **Code Repository**: Git version control
- **Configuration Backup**: Environment variable documentation

### Performance Monitoring
- **Database Queries**: Monitor slow queries
- **API Response Times**: Track endpoint performance
- **Frontend Performance**: Monitor bundle sizes and load times

## Future Enhancements

### Planned Features
- **Mobile App**: React Native mobile application
- **Barcode Scanner**: QR/Barcode scanning for medicines
- **Advanced Analytics**: Machine learning insights
- **Multi-location**: Support for multiple store locations
- **Integration APIs**: External system integrations

### Technical Improvements
- **Caching**: Redis for improved performance
- **Real-time Updates**: WebSocket connections
- **Advanced Security**: Two-factor authentication
- **Automated Testing**: Comprehensive test suite
- **CI/CD Pipeline**: Automated deployment

This comprehensive exploration reveals a sophisticated medical POS system with enterprise-level features and proper security implementations.