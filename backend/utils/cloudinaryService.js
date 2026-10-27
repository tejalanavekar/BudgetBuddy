import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Uploads a buffer (never written to local disk — multer uses memoryStorage) and
// returns the permanent, absolute URL plus the public_id needed to delete it later.
// folder scopes receipts/profile-photos into separate Cloudinary folders so they
// don't mix, and resource_type 'image' + the strict format whitelist mirror the
// same image-only constraint uploadMiddleware's fileFilter already enforces.
export const uploadBuffer = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `budgetbuddy/${folder}`,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

// Best-effort cleanup, same philosophy as the old local-disk deleteReceiptFile —
// an already-gone or never-set resource shouldn't block the delete/update the
// user actually asked for.
export const deleteByPublicId = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // swallow — cleanup failure shouldn't surface as a user-facing error
  }
};
