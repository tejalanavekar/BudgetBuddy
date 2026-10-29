import multer from 'multer';

// Memory storage, not disk — the file never touches the local filesystem at all.
// It lands in req.file.buffer, and the controller uploads that buffer straight to
// Cloudinary. This also means uploads survive fine on hosts with an ephemeral
// filesystem (Render's free tier wipes local disk on every redeploy/restart).
const storage = multer.memoryStorage();

// An explicit allowlist, not just "startsWith('image/')" — that would also accept
// image/svg+xml, which is XML and can carry embedded scripts (stored-XSS risk if ever
// rendered directly, e.g. in an <img> tag or opened in a new tab). Matches exactly what
// validateImageSignature's magic-byte check (JPEG/PNG/GIF/WEBP) actually accepts.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  // .status marks this as a client error for errorHandler — otherwise a plain Error
  // here falls through to the generic masked 500.
  const error = new Error('Only JPEG, PNG, GIF, or WEBP images are allowed.');
  error.status = 400;
  cb(error, false);
};

// Generous cap for a phone-camera receipt photo, but not unbounded — with memory
// storage, an unbounded upload means one request can buffer an arbitrarily large
// file directly into server RAM (not just disk, which made this bad enough before).
const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_RECEIPT_SIZE_BYTES }
});
export default upload;
