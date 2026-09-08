/**
 * Image storage abstraction.
 *
 * MVP implementation: stores uploaded files locally under /uploads and returns
 * a relative URL served statically by Express (see server.js).
 *
 * To move to a cloud provider (Cloudinary, S3, etc.) later:
 *  1. Add the provider's credentials to .env (see .env.example).
 *  2. Replace the body of `saveImage` below to upload to that provider and
 *     return its public URL instead.
 * No other file in the app needs to change — everything calls this module.
 */
const path = require('path');

function saveImage(file) {
  if (!file) return '';
  // multer (disk storage) already wrote the file to /uploads; just build the URL.
  return `/uploads/${path.basename(file.filename)}`;
}

module.exports = { saveImage };
