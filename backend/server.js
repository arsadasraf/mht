import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './src/app.js';
import { connectDatabase } from './src/config/db.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();
    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Machine House (MH) ERP Server running on port ${PORT}`);
      console.log(`🌐 API Base: http://localhost:${PORT}/api/v1`);
      console.log(`💓 Health:   http://localhost:${PORT}/api/v1/health`);
      console.log(`====================================================`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`⚠️ Port ${PORT} is already in use by another process.`);
      } else {
        console.error('Server error:', err);
      }
      process.exit(1);
    });

    const gracefulShutdown = () => {
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    console.error('Failed to start Machine House ERP server:', error);
    process.exit(1);
  }
};

startServer();
