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

  const status = err.status || 500;

  // A deliberate err.status (e.g. a controller throwing a 400/403) carries a message
  // meant for the client. An unhandled 500 does not — it's whatever the underlying
  // failure happened to say (a Mongo error, a third-party SDK's error body, a raw stack
  // fragment), which is exactly the kind of internal detail production shouldn't leak
  // to anyone who happens to trigger it. Only masked for prod + genuinely unexpected errors.
  const isUnexpectedProdError = process.env.NODE_ENV === 'production' && status >= 500;
  const message = isUnexpectedProdError
    ? 'Something went wrong. Please try again later.'
    : (err.message || 'Internal server error');

  res.status(status).json({ message });
};

export default errorHandler;
