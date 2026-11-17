import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

// Middlewares
import { sanitizeMiddleware } from './middleware/sanitize.middleware.js';
import { authenticate } from './middleware/auth.middleware.js';
import { requireModulePermission } from './middleware/rbac.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

// Active PostgreSQL + Prisma Module Routers
import adminRoutes from './modules/admin/routes/index.js';
import crmRoutes from './modules/crm/routes/index.js';
import projectSetupRoutes from './modules/project-setup/routes/index.js';
import designRoutes from './modules/design/routes/index.js';
import purchaseRoutes from './modules/purchase/routes/index.js';
import incomingQualityRoutes from './modules/incoming-quality/routes/index.js';
import storeRoutes from './modules/store/routes/index.js';
import productionTrialRoutes from './modules/production-trial/routes/index.js';
import dispatchRoutes from './modules/dispatch/routes/index.js';
import afterSalesRoutes from './modules/after-sales/routes/index.js';
import s3Routes from './routes/s3.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// OWASP Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Global Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// OWASP Input Sanitization
app.use(sanitizeMiddleware);

// Serve local upload storage fallback (for CAD drawings and QC photos in local dev)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// System Health Endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    system: 'Machine House (MH) ERP Backend API',
    company: 'Machine House - Winding Technologies',
    database: 'PostgreSQL (Prisma ORM)',
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
    version: '2.0.0-postgresql'
  });
});

// Mount Active Modules with Server-Side Authentication & Module-Wise RBAC Enforcement
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/crm', authenticate, requireModulePermission('/crm'), crmRoutes);
app.use('/api/v1/project-setup', authenticate, requireModulePermission('/project-setup'), projectSetupRoutes);
app.use('/api/v1/design', authenticate, requireModulePermission('/design'), designRoutes);
app.use('/api/v1/purchase', authenticate, requireModulePermission('/purchase'), purchaseRoutes);
app.use('/api/v1/quality', authenticate, requireModulePermission('/incoming-quality'), incomingQualityRoutes);
app.use('/api/v1/incoming-quality', authenticate, requireModulePermission('/incoming-quality'), incomingQualityRoutes);
app.use('/api/v1/store', authenticate, requireModulePermission('/store'), storeRoutes);
app.use('/api/v1/production-trial', authenticate, requireModulePermission('/production-trial'), productionTrialRoutes);
app.use('/api/v1/dispatch', authenticate, requireModulePermission('/dispatch'), dispatchRoutes);
app.use('/api/v1/after-sales', authenticate, requireModulePermission('/after-sales'), afterSalesRoutes);
app.use('/api/v1/s3', authenticate, s3Routes);

// Global Error Handling Middleware
app.use(errorHandler);

export default app;
