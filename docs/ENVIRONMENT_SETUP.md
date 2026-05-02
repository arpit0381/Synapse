# Environment Setup and Configuration

## Overview

Synapse Lite requires specific environment configurations for both backend and frontend components. This document covers development setup, production deployment, and configuration management.

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Git**: Version control system
- **Supabase Account**: For database and authentication
- **Groq API Key**: For AI features (optional for basic functionality)

### Development Environment
- **Operating System**: Windows 10/11, macOS, or Linux
- **RAM**: Minimum 8GB, recommended 16GB
- **Storage**: 5GB free space for dependencies and build artifacts
- **Network**: Stable internet connection for package downloads

## Backend Setup

### 1. Project Initialization

```bash
# Clone the repository
git clone <repository-url>
cd synapse-lite/backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Environment Configuration

Create `.env` file in the backend directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Configuration (Optional)
GROQ_API_KEY=your-groq-api-key

# Application Configuration
PORT=4000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Database Configuration (if using custom database)
DATABASE_URL=postgresql://user:password@localhost:5432/synapse_lite
```

### 3. Supabase Setup

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for project initialization

#### Get API Keys
1. Go to Project Settings → API
2. Copy Project URL and anon/public key
3. For backend, use the `service_role` key (keep secret!)

#### Database Setup
```bash
# Initialize database schema
npm run setup-db
```

This will:
- Connect to your Supabase project
- Execute the schema.sql file
- Create all necessary tables and policies
- Verify table creation

### 4. Development Server

```bash
# Start development server with hot reload
npm run dev

# Server will start on http://localhost:4000
```

### 5. Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## Frontend Setup

### 1. Project Initialization

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### 2. Environment Configuration

Create `.env.local` file in the frontend directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000

# Application Configuration
NEXT_PUBLIC_APP_ENV=development

# Optional: Analytics, Monitoring
NEXT_PUBLIC_GA_TRACKING_ID=your-ga-id
```

### 3. Development Server

```bash
# Start development server
npm run dev

# Application will be available at http://localhost:3000
```

### 4. Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## Database Schema Setup

### Automated Setup

The `npm run setup-db` command will automatically:
1. Connect to your Supabase project
2. Execute the complete schema from `backend/supabase/schema.sql`
3. Create all tables, indexes, and policies
4. Enable Row Level Security
5. Set up real-time subscriptions

### Manual Setup

If automated setup fails, manually apply the schema:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `backend/supabase/schema.sql`
3. Paste and execute the SQL

### Schema Components

#### Core Tables Created:
- `profiles` - User profiles and extended data
- `workspaces` - Team/organization containers
- `workspace_members` - User-workspace relationships
- `channels` - Communication channels
- `messages` - Channel messages with threading
- `direct_messages` - Private conversations
- `tasks` - Kanban task management
- `notifications` - In-app notifications
- `files` - File metadata storage

#### Security Policies:
- Row Level Security (RLS) enabled on all tables
- Users can only access their workspace data
- Private channels require membership
- Message editing restricted to authors

## Authentication Setup

### Supabase Auth Configuration

1. **Enable Authentication Providers** (optional):
   - Go to Authentication → Providers
   - Enable Email, Google, GitHub as needed

2. **Configure Site URL**:
   - Authentication → Settings
   - Set Site URL to your frontend URL
   - Add redirect URLs for auth flows

3. **Email Templates** (optional):
   - Customize welcome and password reset emails
   - Add your branding

### JWT Configuration

The backend uses Supabase JWT tokens for authentication:
- Tokens are validated on each request
- User context is extracted from JWT claims
- Automatic token refresh handled by frontend

## AI Features Setup

### Groq API Configuration

1. **Get API Key**:
   - Visit [groq.com](https://groq.com)
   - Create account and get API key
   - Add to backend `.env` as `GROQ_API_KEY`

2. **AI Features**:
   - Chat with AI assistant
   - Message summarization
   - Content drafting
   - Code generation

### AI Context Enhancement

The AI assistant automatically gets context about:
- Current workspace and channels
- Team members and their roles
- Active tasks and projects
- Recent conversations

## Development Workflow

### Local Development

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Database changes (if needed)
cd backend
npm run setup-db
```

### Code Changes

1. **Backend Changes**:
   - Modify TypeScript files in `src/`
   - Server auto-restarts on changes
   - API endpoints hot-reload

2. **Frontend Changes**:
   - Modify React components
   - Next.js handles hot reloading
   - State persists across reloads

3. **Database Changes**:
   - Update `schema.sql` for new tables/policies
   - Run `npm run setup-db` to apply changes

### Testing Changes

```bash
# Backend linting and type checking
cd backend
npm run build  # This will catch TypeScript errors

# Frontend linting
cd frontend
npm run lint

# Full application testing
# Open browser to http://localhost:3000
# Test features: login, messaging, calls, tasks
```

## Production Deployment

### Backend Deployment

#### Environment Variables for Production:
```env
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
GROQ_API_KEY=your-production-groq-key
FRONTEND_URL=https://yourdomain.com
PORT=4000
```

#### Deployment Options:
1. **Vercel**: Connect GitHub repo, automatic deployments
2. **Railway**: Git-based deployment with database
3. **Heroku**: Traditional PaaS deployment
4. **Docker**: Containerized deployment

#### Docker Deployment:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["npm", "start"]
```

### Frontend Deployment

#### Environment Variables for Production:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_APP_ENV=production
```

#### Build Optimization:
```bash
# Production build with optimizations
npm run build

# Analyze bundle size
npm install -g @next/bundle-analyzer
npm run build:analyze
```

#### Deployment Platforms:
1. **Vercel**: Recommended for Next.js (automatic optimization)
2. **Netlify**: Static hosting with serverless functions
3. **AWS Amplify**: Full-stack AWS deployment
4. **Self-hosted**: Nginx + PM2 for process management

### Database Production Setup

#### Supabase Production Configuration:
1. **Enable Point-in-Time Recovery**
2. **Set up Database Backups**
3. **Configure Database Password**
4. **Enable Database Webhooks** (if needed)

#### Performance Optimization:
1. **Enable Connection Pooling**
2. **Set up Database Indexes**
3. **Configure Row Level Security**
4. **Monitor Query Performance**

## Monitoring and Maintenance

### Application Monitoring

#### Backend Monitoring:
- **Health Check**: `GET /health` endpoint
- **Error Logging**: Winston or similar logging library
- **Performance Metrics**: Response times, error rates
- **Database Metrics**: Query performance, connection counts

#### Frontend Monitoring:
- **Error Tracking**: Sentry or similar service
- **Performance Monitoring**: Core Web Vitals
- **User Analytics**: Page views, feature usage
- **Real-time Metrics**: Active users, concurrent calls

### Database Maintenance

#### Regular Tasks:
- **Backup Verification**: Test backup restoration
- **Index Optimization**: Monitor and optimize query performance
- **Storage Cleanup**: Remove old logs and temporary files
- **Security Updates**: Keep Supabase and dependencies updated

#### Monitoring Queries:
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT query, total_time, calls
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Troubleshooting

### Common Issues

#### Backend Issues:
1. **Port Already in Use**:
   ```bash
   # Find process using port 4000
   netstat -ano | findstr :4000
   # Kill the process
   taskkill /PID <PID> /F
   ```

2. **Database Connection Failed**:
   - Check SUPABASE_URL and SERVICE_ROLE_KEY
   - Verify Supabase project is active
   - Check network connectivity

3. **CORS Errors**:
   - Verify FRONTEND_URL in backend .env
   - Check allowed origins in Socket.io config

#### Frontend Issues:
1. **Build Failures**:
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

2. **Environment Variables Not Loading**:
   - Ensure variables start with `NEXT_PUBLIC_` for client-side
   - Restart development server after .env changes

3. **Socket Connection Issues**:
   - Check backend server is running
   - Verify WebSocket URL configuration
   - Check browser network tab for connection errors

#### Database Issues:
1. **Schema Not Applied**:
   ```bash
   cd backend
   npm run setup-db
   ```

2. **RLS Blocking Queries**:
   - Check user authentication
   - Verify workspace membership
   - Review RLS policies in Supabase dashboard

### Debug Mode

#### Enable Debug Logging:
```bash
# Backend debug mode
DEBUG=* npm run dev

# Frontend debug mode
DEBUG=* npm run dev
```

#### Supabase Logs:
- Go to Supabase Dashboard → Logs
- Check API logs, database logs, and real-time logs
- Filter by user or time range

## Security Checklist

### Pre-deployment Security:
- [ ] Environment variables secured (no secrets in code)
- [ ] HTTPS enabled for production
- [ ] CORS properly configured
- [ ] Authentication working correctly
- [ ] Database RLS policies active
- [ ] API rate limiting configured
- [ ] Input validation implemented
- [ ] Dependencies updated and audited

### Post-deployment Security:
- [ ] Monitor for security vulnerabilities
- [ ] Regular dependency updates
- [ ] Database backups verified
- [ ] Access logs monitored
- [ ] SSL certificates renewed
- [ ] Security headers configured

## Performance Optimization

### Backend Optimization:
- **Enable Gzip Compression**
- **Implement Caching** (Redis planned)
- **Database Query Optimization**
- **Connection Pooling**
- **Rate Limiting**

### Frontend Optimization:
- **Code Splitting** (automatic with Next.js)
- **Image Optimization**
- **Bundle Analysis**
- **Lazy Loading**
- **Service Worker** (planned)

### Database Optimization:
- **Index Optimization**
- **Query Performance Monitoring**
- **Connection Pooling**
- **Data Archiving Strategy**

---
*Environment setup documentation generated on: 2026-05-02*