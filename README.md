# Medical POS System

A comprehensive Point of Sale (POS) system designed specifically for medical stores and pharmacies. Built with modern web technologies, it provides real-time inventory management, sales tracking, user management, and multi-role access control.

## 🏥 Features

### Core POS Features

- **Real-time Sales Processing**: Quick medicine search and checkout
- **Inventory Management**: Track stock levels, low stock alerts, and expiry dates
- **Multi-role Access**: Admin, Counter, and Warehouse staff roles
- **Order Management**: Complete order history and detailed receipts
- **Customer Management**: Customer information and purchase history
- **Payment Processing**: Multiple payment methods with tax calculation

### Administrative Features

- **User Management**: Create, edit, and manage staff accounts
- **Sales Analytics**: Dashboard with charts and reports
- **Supplier Management**: Track suppliers and manage purchase orders
- **Inventory Reports**: Stock levels, sales trends, and profit analysis
- **Audit Logs**: Track all system activities and changes

### Technical Features

- **Real-time Updates**: Live inventory and sales data
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Secure Authentication**: Supabase Auth with role-based access
- **Data Backup**: Automatic database backups and data integrity
- **API Integration**: RESTful API for external integrations

## 🏗️ Architecture

### Frontend (React + Vite)

- **React 18** with modern hooks and functional components
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for responsive and modern UI
- **React Router** for client-side routing
- **React Query** for server state management
- **Redux Toolkit** for client state management

### Backend (Node.js + Express)

- **Node.js** with Express.js framework
- **SQLite** database for local development
- **Supabase** for production database and authentication
- **JWT** authentication with role-based middleware
- **RESTful API** design with proper error handling

### Database Schema

- **Users**: Staff accounts with roles and permissions
- **Medicines**: Product catalog with pricing and stock
- **Orders**: Sales transactions and order details
- **Suppliers**: Vendor information and purchase orders
- **Organizations**: Multi-tenant support

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd pos
   ```

2. **Install dependencies**

   ```bash
   # Install frontend dependencies
   cd client
   npm install

   # Install backend dependencies
   cd ../server
   npm install
   ```

3. **Environment Setup**

   ```bash
   # Frontend (.env in client directory)
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_URL=http://localhost:3001/api

   # Backend (.env in server directory)
   PORT=3002
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
   JWT_SECRET=your_jwt_secret
   ```

4. **Database Setup**

   ```bash
   # Run database migrations
   cd server
   npm run migrate

   # Seed initial data
   npm run seed
   ```

5. **Start Development Servers**

   ```bash
   # Start backend server
   cd server
   npm run dev

   # Start frontend (in new terminal)
   cd client
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Admin Panel: http://localhost:3000 (separate admin panel)

## 👥 User Roles & Permissions

### Admin

- Full system access
- User management
- Sales analytics and reports
- Inventory management
- Supplier management
- System configuration

### Counter Staff

- Process sales transactions
- Search and sell medicines
- View customer information
- Generate receipts
- Basic inventory checks

### Warehouse Staff

- Inventory management
- Stock updates
- Supplier orders
- Low stock monitoring
- Medicine catalog management



## 🔧 Development

### Project Structure

```
pos/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   ├── store/         # Redux store
│   │   └── config/        # Configuration files
│   └── public/            # Static assets
├── server/                # Backend Node.js application
│   ├── controllers/       # Route controllers
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   └── scripts/          # Database scripts
└── pos-admin-panel/      # Separate admin panel
```

### Available Scripts

#### Frontend (client/)

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

#### Backend (server/)

```bash
npm run dev          # Start development server
npm run start        # Start production server
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
npm run test         # Run tests
```

## 🚀 Deployment

### Frontend Deployment (Vercel)

```bash
cd client
npm run build
# Deploy to Vercel or other hosting platform
```

### Backend Deployment (Railway/Heroku)

```bash
cd server
npm run build
# Deploy to Railway, Heroku, or other platform
```

### Environment Variables for Production

- Set all required environment variables
- Configure database connections
- Set up CORS origins
- Configure authentication providers

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Granular permissions per role
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Proper cross-origin resource sharing
- **Rate Limiting**: API rate limiting to prevent abuse

## 📈 Monitoring & Analytics

- **Real-time Dashboard**: Live sales and inventory metrics
- **Sales Reports**: Daily, weekly, monthly sales analysis
- **Inventory Reports**: Stock levels and movement tracking
- **User Activity Logs**: Track all system activities
- **Error Monitoring**: Comprehensive error logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation in the `/docs` folder
- Review the troubleshooting guide

## 🔄 Updates & Maintenance

- Regular security updates
- Feature enhancements
- Bug fixes and performance improvements
- Database schema updates
- API versioning

---

**Built with ❤️ for medical stores and pharmacies**
