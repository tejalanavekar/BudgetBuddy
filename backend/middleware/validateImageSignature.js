import fs from 'fs/promises';

// Multer's fileFilter only sees the client-supplied Content-Type header for the upload —
// trivially spoofed (rename anything to receipt.png, set the header, done). This checks
// the actual bytes written to disk against known image file signatures ("magic numbers"),
// so a mislabeled file is caught after upload instead of trusted at face value. Runs after
// upload.single(...) in the route chain, since the bytes aren't available before then.
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

const validateImageSignature = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const handle = await fs.open(req.file.path, 'r');
    const buffer = Buffer.alloc(12);
    await handle.read(buffer, 0, 12, 0);
    await handle.close();

    if (!isValidImageSignature(buffer)) {
      await fs.unlink(req.file.path).catch(() => {}); // don't leave the rejected file on disk
      return res.status(400).json({ message: 'Uploaded file is not a valid image.' });
    }

    next();
  } catch (err) {
    next(err);
  }
};

export default validateImageSignature;
