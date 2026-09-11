import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.ATLAS_URI);
        logger.info(`MongoDB Connected: ${conn.connection.name}`);
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

// Used during graceful shutdown — a clean disconnect (finishing/aborting in-flight
// operations properly) instead of just letting the process die mid-connection.
export const disconnectDB = async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
};

export default connectDB;