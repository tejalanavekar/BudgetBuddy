import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed!'), false);
};

// Generous cap for a phone-camera receipt photo, but not unbounded — without this,
// multer will happily buffer/write a file of any size, letting one request fill the
// disk (or eat memory) with no limit at all.
const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_RECEIPT_SIZE_BYTES }
});
export default upload;