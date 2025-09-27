# Medical POS System - Development Setup Guide

## Prerequisites

Before setting up the Medical POS System, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control
- **Supabase Account** (free tier available)
- **Code Editor** (VS Code recommended)

## Project Overview

This is a full-stack medical POS system with:
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Supabase
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth with JWT

## Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/Ashhad1200/medical-POS.git
cd medical-POS

# Install server dependencies
cd server
npm install

# Install client dependencies  
cd ../client
npm install
```

## Step 2: Supabase Setup

### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new account or sign in
3. Create a new project
4. Wait for the project to initialize (2-3 minutes)
5. Get your project credentials:
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon Key**: Found in Settings > API
   - **Service Role Key**: Found in Settings > API

### 2.2 Database Schema Setup

The system requires a comprehensive database schema. Run the following in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  code VARCHAR NOT NULL UNIQUE,
  description TEXT,
  address TEXT,
  phone VARCHAR,
  email VARCHAR,
  website VARCHAR,
  is_active BOOLEAN DEFAULT true,
  subscription_tier VARCHAR DEFAULT 'basic',
  max_users INTEGER DEFAULT 5,
  current_users INTEGER DEFAULT 0,
  currency VARCHAR DEFAULT 'USD',
  timezone VARCHAR DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  access_valid_till TIMESTAMPTZ
);

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_uid UUID NOT NULL UNIQUE,
  username VARCHAR NOT NULL UNIQUE,
  email VARCHAR NOT NULL UNIQUE,
  full_name VARCHAR,
  phone VARCHAR,
  avatar_url TEXT,
  role VARCHAR DEFAULT 'user',
  role_in_pos VARCHAR,
  permissions JSONB DEFAULT '[]'::JSONB,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  subscription_status VARCHAR DEFAULT 'pending',
  is_active BOOLEAN DEFAULT false,
  is_email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  theme VARCHAR DEFAULT 'light',
  language VARCHAR DEFAULT 'en',
  timezone VARCHAR DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Continue with other tables (medicines, orders, etc.)
-- See the full schema in db.txt
```

## Step 3: Environment Configuration

### 3.1 Server Environment (.env in server directory)

```bash
# Copy the example file
cp .env.example .env
```

Edit the `.env` file with your actual values:

```env
PORT=3001
NODE_ENV=development

# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### 3.2 Client Environment (.env in client directory)

```bash
# Copy the example file
cp .env.example .env
```

Edit the `.env` file:

```env
# API Configuration
VITE_API_URL=http://localhost:3001/api

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Application Configuration
VITE_APP_NAME=Medical POS System
VITE_NODE_ENV=development
```

## Step 4: Database Migration and Seeding

```bash
cd server

# Run database setup script
node scripts/setup-complete-supabase.js

# Or run migration separately
node scripts/migrate-to-supabase.js

# Seed initial data
node scripts/seed-all.js
```

## Step 5: Start Development Servers

### Terminal 1 - Backend Server
```bash
cd server
npm run dev
```

The server will start on `http://localhost:3001`

### Terminal 2 - Frontend Client
```bash
cd client
npm run dev
```

The client will start on `http://localhost:5173`

## Step 6: Default Login Credentials

After seeding, you can use these credentials:

- **Admin**: 
  - Email: `admin@moizmedical.com`
  - Password: `admin123`

- **Counter Staff**: 
  - Email: `counter@moizmedical.com`
  - Password: `counter123`

- **Warehouse Staff**: 
  - Email: `warehouse@moizmedical.com`
  - Password: `warehouse123`

## Step 7: Verification

### 7.1 Check API Status
```bash
curl http://localhost:3001/health
```

Should return:
```json
{
  "success": true,
  "message": "Medical POS API is running",
  "database": "Supabase PostgreSQL"
}
```

### 7.2 Check Authentication
```bash
curl -X POST http://localhost:3001/api/auth/status
```

### 7.3 Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Supabase Dashboard: Your project URL

## Step 8: Testing the System

### 8.1 Login Test
1. Go to http://localhost:5173
2. Login with admin credentials
3. You should see the dashboard

### 8.2 API Tests
```bash
# Test medicine listing
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/medicines

# Test inventory
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/inventory

# Test orders
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/orders
```

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**
   - Ensure all Supabase variables are set in `.env`
   - Check that variable names match exactly
   - Restart the server after changing `.env`

2. **"User profile not found"**
   - Run the migration script: `node scripts/migrate-to-supabase.js`
   - Check if users table exists in Supabase

3. **CORS errors**
   - Verify `CORS_ORIGIN` in server `.env`
   - Check that client URL matches the CORS origin

4. **Connection refused**
   - Ensure both servers are running
   - Check ports 3001 (server) and 5173 (client)

5. **Database connection issues**
   - Verify Supabase project is active
   - Check database credentials
   - Ensure RLS policies are set up correctly

### Debug Mode

Enable debug logging by adding to your `.env`:
```env
NODE_ENV=development
DEBUG=true
```

### Reset Database

If you need to reset the database:
```bash
cd server
node scripts/reset-db.js
node scripts/setup-complete-supabase.js
```

## Production Deployment

### Frontend (Vercel/Netlify)
1. Build the client: `cd client && npm run build`
2. Deploy the `dist` folder
3. Set environment variables in deployment platform

### Backend (Railway/Heroku)
1. Set production environment variables
2. Update CORS origins for production URLs
3. Deploy the server directory

### Environment Variables for Production
- Update all URLs to production values
- Use strong JWT secrets
- Enable HTTPS only
- Configure proper CORS origins

## Additional Resources

- **Supabase Documentation**: https://supabase.com/docs
- **React Documentation**: https://react.dev
- **Express.js Guide**: https://expressjs.com
- **Tailwind CSS**: https://tailwindcss.com

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server and client logs
3. Check Supabase project status
4. Verify all environment variables are set correctly

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique JWT secrets in production
- Enable RLS policies in Supabase for data security
- Regularly update dependencies
- Use HTTPS in production
- Implement proper rate limiting
- Monitor user activities through audit logs

This setup guide provides everything needed to get the Medical POS System running in a development environment.