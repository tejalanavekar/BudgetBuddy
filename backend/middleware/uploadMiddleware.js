import multer from 'multer';

// Memory storage, not disk — the file never touches the local filesystem at all.
// It lands in req.file.buffer, and the controller uploads that buffer straight to
// Cloudinary. This also means uploads survive fine on hosts with an ephemeral
// filesystem (Render's free tier wipes local disk on every redeploy/restart).
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed!'), false);
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
