/**
 * cloudinary.ts — image upload (same unsigned preset as the site)
 * The website uploads via browser FormData; RN needs {uri, name, type} parts.
 * uploadScreenshot → payment screenshots; uploadAvatar → profile photos.
 */
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from './config';

async function uploadImage(uri: string, folder: string, name: string, mime: string): Promise<string | null> {
  try {
    const form = new FormData();
    form.append('file', { uri, name, type: mime } as unknown as Blob);
    form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    form.append('folder', folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = await res.json();
    if (data?.secure_url) return data.secure_url;
    return null;
  } catch {
    return null;
  }
}

/** Payment screenshot upload (checkout UPI verification) */
export async function uploadScreenshot(uri: string, orderNumber: string): Promise<string | null> {
  return uploadImage(uri, `myshop/payment-screenshots/${orderNumber || 'misc'}`, `pay-${orderNumber}.jpg`, 'image/jpeg');
}

/** Profile avatar upload — same folder convention as the site (myshop/avatars/{userId}) */
export async function uploadAvatar(uri: string, userId: string, mime = 'image/jpeg'): Promise<string | null> {
  const ext = mime === 'image/png' ? 'png' : 'jpg';
  return uploadImage(uri, `myshop/avatars/${userId || 'misc'}`, `avatar-${Date.now()}.${ext}`, mime);
}
