import multer from 'multer';
import logger from '../utils/logger.js';

// Catches anything a controller's own try/catch missed (or re-threw) and
// guarantees every error response has the same {message} shape. Must be
// registered LAST, after all routes.
const errorHandler = (err, req, res, next) => {
  logger.error(err);
  if (res.headersSent) return next(err);

  // Multer's own errors (file too large, wrong field name, etc.) are a bad *request*,
  // not a server failure — without this they'd fall through to the generic 500 below.
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File is too large. Maximum upload size is 10MB.'
      : err.message;
    return res.status(400).json({ message });
  }

  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
};

export default errorHandler;
