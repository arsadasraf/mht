import mongoose from 'mongoose';

export const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mht_erp';
  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 4000,
      autoIndex: true
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    // If running inside Docker and primary URI points to localhost, auto-retry with docker service hostname
    if (primaryUri.includes('127.0.0.1') || primaryUri.includes('localhost')) {
      const dockerUri = primaryUri.replace('127.0.0.1', 'mongodb').replace('localhost', 'mongodb');
      try {
        console.log(`[Database] Retrying connection with Docker service name: ${dockerUri}...`);
        const conn = await mongoose.connect(dockerUri, {
          serverSelectionTimeoutMS: 5000,
          autoIndex: true
        });
        console.log(`[Database] MongoDB Connected via Docker network: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      } catch (retryError) {
        console.error(`[Database Error] Docker network connection failed: ${retryError.message}`);
      }
    }
    console.error(`[Database Error] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

export const connectDatabase = connectDB;
