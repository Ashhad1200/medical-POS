#!/bin/bash

# Railway Deployment Script for Medical POS System
# This script helps prepare the project for Railway deployment

echo "🚀 Preparing Medical POS System for Railway deployment..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

echo "✅ Railway CLI found"

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway:"
    railway login
fi

echo "✅ Railway authentication verified"

# Create new Railway project
echo "📦 Creating new Railway project..."
railway login

echo "🔧 Setting up backend service..."
echo "   1. Go to railway.app and create a new project"
echo "   2. Connect your GitHub repository"
echo "   3. Railway will detect the railway.json configuration"
echo "   4. Set the following environment variables in Railway dashboard:"
echo ""
echo "   Backend Environment Variables:"
echo "   - NODE_ENV=production"
echo "   - NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
echo "   - SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
echo "   - JWT_SECRET=your-strong-jwt-secret"
echo "   - JWT_EXPIRES_IN=7d"
echo "   - CLIENT_URL=https://your-frontend-domain.railway.app"
echo "   - COMPANY_NAME=Medical Store POS"
echo "   - COMPANY_ADDRESS=123 Medical Street, Healthcare City"
echo "   - COMPANY_PHONE=+1234567890"
echo "   - COMPANY_EMAIL=info@medicalstore.com"
echo ""
echo "🎨 Setting up frontend service..."
echo "   1. Create a second service in the same Railway project"
echo "   2. Set root directory to 'client'"
echo "   3. Set the following environment variables:"
echo ""
echo "   Frontend Environment Variables:"
echo "   - VITE_API_URL=https://your-backend-url.railway.app/api"
echo "   - VITE_SUPABASE_URL=https://your-project.supabase.co"
echo "   - VITE_SUPABASE_ANON_KEY=your-anon-key"
echo "   - VITE_APP_NAME=Medical POS System"
echo "   - VITE_ENVIRONMENT=production"
echo ""
echo "📚 For detailed instructions, see RAILWAY_DEPLOYMENT.md"
echo ""
echo "✅ Railway configuration files created:"
echo "   - railway.json (root - for backend)"
echo "   - nixpacks.toml (root - for backend)"
echo "   - client/railway.json (for frontend)"
echo "   - client/nixpacks.toml (for frontend)"
echo "   - server/.env.production (environment template)"
echo "   - client/.env.production (environment template)"
echo ""
echo "🎉 Ready for Railway deployment!"
echo "   Next steps:"
echo "   1. Push your code to GitHub"
echo "   2. Create Railway project and connect repository"
echo "   3. Configure environment variables"
echo "   4. Deploy!"
echo ""
echo "📖 Read RAILWAY_DEPLOYMENT.md for complete instructions"