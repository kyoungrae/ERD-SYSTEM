import dotenv from 'dotenv';
dotenv.config();

export const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),

    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/erd-system',
    },

    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
