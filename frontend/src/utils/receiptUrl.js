// Receipt/profile images are now stored on Cloudinary, so the backend returns a full,
// absolute URL directly — no base-URL prefix needed. A bare filename (no "http://..."
// prefix) means the record predates that move and was stored on the backend's local
// disk, which is wiped on every redeploy — that file no longer exists anywhere, so
// there's nothing to show for it.
export const getImageUrl = (pathOrUrl) => {
  if (!pathOrUrl) return null;
  return pathOrUrl.startsWith('http') ? pathOrUrl : null;
};
