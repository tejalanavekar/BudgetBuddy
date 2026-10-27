// Multer's fileFilter only sees the client-supplied Content-Type header for the upload —
// trivially spoofed (rename anything to receipt.png, set the header, done). This checks
// the actual bytes against known image file signatures ("magic numbers"), so a mislabeled
// file is caught before it's ever uploaded to Cloudinary. Runs after upload.single(...)
// in the route chain, reading directly from req.file.buffer (multer's memoryStorage) —
// no disk I/O needed since the bytes are already in memory.
const SIGNATURES = [
  { name: 'JPEG', bytes: [0xFF, 0xD8, 0xFF] },
  { name: 'PNG', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { name: 'GIF', bytes: [0x47, 0x49, 0x46, 0x38] } // "GIF8" — covers GIF87a and GIF89a
];

const isValidImageSignature = (buffer) => {
  if (SIGNATURES.some(({ bytes }) => bytes.every((byte, i) => buffer[i] === byte))) {
    return true;
  }
  // WEBP's signature is split: "RIFF" at the start, "WEBP" four bytes later.
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
};

const validateImageSignature = (req, res, next) => {
  if (!req.file) return next();

  if (!isValidImageSignature(req.file.buffer)) {
    return res.status(400).json({ message: 'Uploaded file is not a valid image.' });
  }

  next();
};

export default validateImageSignature;
