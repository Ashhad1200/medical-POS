# Railway Deployment Guide for Medical POS System

This guide will help you deploy the Medical POS System to Railway.

## Prerequisites

1. Railway account (sign up at [railway.app](https://railway.app))
2. GitHub repository with your code
3. Supabase project set up

## Deployment Steps

### 1. Deploy Backend (Server)

1. **Connect to Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"
   - Choose this repository

2. **Configure Build Settings:**
   - Railway will automatically detect the `railway.json` and `nixpacks.toml` files
   - The build will install dependencies from the `server` directory
   - Start command: `cd server && npm start`

3. **Set Environment Variables:**
   Go to your Railway project dashboard and add these variables:
   ```
   # Server Configuration
   NODE_ENV=production
   PORT=$PORT
   
   # Supabase Configuration
   # IMPORTANT: Use NEXT_PUBLIC_ prefix for these variables (not VITE_)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # JWT Configuration
   JWT_SECRET=your-strong-jwt-secret
   JWT_EXPIRES_IN=7d
   
   # Client Configuration
   CLIENT_URL=https://your-frontend-domain.railway.app
   
   # Company Information
   COMPANY_NAME=Medical Store POS
   COMPANY_ADDRESS=123 Medical Street, Healthcare City
   COMPANY_PHONE=+1234567890
   COMPANY_EMAIL=info@medicalstore.com
   
   # Admin Panel Configuration
   NEXT_PUBLIC_APP_NAME="Medical POS Admin Panel"
   NEXT_PUBLIC_APP_VERSION="1.0.0"
   NEXT_PUBLIC_ENVIRONMENT=production
   ```

4. **Deploy:**
   - Railway will automatically deploy your backend
   - Note the generated URL (e.g., `https://your-app.railway.app`)

### 2. Deploy Frontend (Client)

1. **Create a New Service:**
   - In the same Railway project, click "+ New"
   - Select "GitHub Repo" and choose the same repository
   - This will create a second service for the frontend

2. **Configure Frontend Build:**
   - Set the root directory to `client`
   - Build command: `npm run build`
   - Start command: `npm run preview`

3. **Set Frontend Environment Variables:**
   ```
   VITE_API_URL=https://your-backend-url.railway.app/api
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### 3. Update CORS Configuration

After deployment, update the CORS configuration in your backend:

1. Add your Railway frontend URL to the `allowedOrigins` array in `server/server.js`
2. Update the `CLIENT_URL` environment variable in Railway

### 4. Database Setup

Ensure your Supabase database is properly configured:

1. Run the setup scripts if needed:
   ```bash
   npm run seed
   ```

2. Verify all tables and RLS policies are in place

## Configuration Files Created

- `railway.json` - Railway deployment configuration
- `nixpacks.toml` - Build configuration for Railway
- `server/.env.production` - Production environment template

## Monitoring and Logs

- Access logs through Railway dashboard
- Health check endpoint: `/health`
- Monitor performance and errors in Railway metrics

## Troubleshooting

### Common Issues:

1. **Build Failures:**
   - Check that all dependencies are in `package.json`
   - Verify Node.js version compatibility
   - If you see "undefined variable 'npm-9_x'" error, ensure nixpacks.toml only includes valid packages

2. **Nixpacks Configuration:**
   - Use only `nodejs-18_x` in nixPkgs (npm is included with Node.js)
   - Avoid specifying separate npm versions in nixpacks.toml
   - Ensure commands use `&&` to chain directory changes: `cd server && npm ci`
   - If you see "npm ci failed" error, verify package-lock.json exists in server directory

3. **Supabase Environment Variable Errors:**
   If you see "Missing Supabase environment variables" error:
   - Check variable names: The server expects `NEXT_PUBLIC_` prefix, not `VITE_`:
     ```
     # ✅ Correct (for server)
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     
     # ❌ Wrong (these are for client/frontend)
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```
   - Set in Railway dashboard: Make sure all three Supabase variables are set in your Railway service environment variables
    - Remove quotes: Don't wrap URLs in quotes when setting environment variables

### Client Health Check Failures

If your frontend service shows "1/1 replicas never became healthy! Healthcheck failed!":

1. **Port binding issues**: Ensure the service binds to Railway's PORT:
   ```bash
   # In railway.json startCommand
   "npm run preview -- --port $PORT --host 0.0.0.0"
   ```

2. **Host configuration**: Make sure vite.config.js preview uses:
   ```javascript
   preview: {
     port: process.env.PORT || 4173,
     host: '0.0.0.0',
   }
   ```

3. **Health check timeout**: Increase timeout in railway.json:
   ```json
   "healthcheckTimeout": 300
   ```

4. **Build issues**: Check Railway logs for build errors and ensure `npm run build` completes successfully
 
 4. **CORS Errors:**
    - Ensure frontend URL is added to CORS configuration
   - Check `CLIENT_URL` environment variable

4. **Database Connection:**
   - Verify Supabase credentials
   - Check network connectivity

5. **Environment Variables:**
   - Ensure all required variables are set
   - Check for typos in variable names

## Security Notes

- Never commit actual environment variables to the repository
- Use strong, unique JWT secrets
- Regularly rotate API keys
- Monitor access logs for suspicious activity

## Support

For deployment issues:
1. Check Railway documentation
2. Review application logs
3. Verify environment configuration
4. Test API endpoints manually

---

**Note:** This deployment guide assumes you have a working Supabase database. Make sure to set up your database schema and seed data before deploying.