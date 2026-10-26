import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

// Middlewares
import { sanitizeMiddleware } from './middleware/sanitize.middleware.js';
import { ipWhitelistMiddleware } from './middleware/ipWhitelist.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

// The 10 Core Operational Module Routers
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
import masterRoutes from './modules/masters/routes/index.js';
import s3Routes from './routes/s3.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// OWASP Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Next.js frontend during dev while enforcing clickjacking and transport protections
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

// OWASP A03 NoSQL Injection query sanitization
app.use(sanitizeMiddleware);

// Plant & Department IP Whitelisting Security Check
app.use(ipWhitelistMiddleware);


// Serve local upload storage fallback (for CAD drawings and QC photos in local dev)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// System Health Endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    system: 'Machine House (MH) ERP Backend API',
    company: 'Machine House - Winding Technologies',
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
    version: '1.0.0-innovation'
  });
});

// Mount The 10 Operational Modules
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/crm', crmRoutes);
app.use('/api/v1/project-setup', projectSetupRoutes);
app.use('/api/v1/design', designRoutes);
app.use('/api/v1/purchase', purchaseRoutes);
app.use('/api/v1/quality', incomingQualityRoutes);
app.use('/api/v1/incoming-quality', incomingQualityRoutes);
app.use('/api/v1/store', storeRoutes);
app.use('/api/v1/production-trial', productionTrialRoutes);
app.use('/api/v1/dispatch', dispatchRoutes);
app.use('/api/v1/after-sales', afterSalesRoutes);
app.use('/api/v1/masters', masterRoutes);
app.use('/api/masters', masterRoutes);
app.use('/api/v1/s3', s3Routes);

// Global Error Handling Middleware
app.use(errorHandler);

export default app;
