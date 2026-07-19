import logger from '../utils/logger.js';

// Catches anything a controller's own try/catch missed (or re-threw) and
// guarantees every error response has the same {message} shape. Must be
// registered LAST, after all routes.
const errorHandler = (err, req, res, next) => {
  logger.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
};

export default errorHandler;
