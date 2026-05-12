import { firebaseStorage } from '@/lib/firebase/storage';

/**
 * Uploads any base64 data-URL images embedded in HTML to Firebase Storage
 * and replaces their src with the remote URL.
 * Call this once just before saving a contract or template to avoid
 * storing orphaned files when the user discards their edits.
 */
export async function uploadContractImages(html: string): Promise<string> {
  if (!html || !html.includes('data:')) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const images = Array.from(doc.querySelectorAll<HTMLImageElement>('img[src^="data:"]'));

  if (images.length === 0) return html;

  await Promise.all(
    images.map(async (img) => {
      const dataUrl = img.getAttribute('src');
      if (!dataUrl) return;
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const ext = blob.type.split('/')[1] ?? 'png';
        const file = new File([blob], `contract-image.${ext}`, { type: blob.type });
        const { url } = await firebaseStorage.uploadFile(file, 'contracts/images/');
        img.setAttribute('src', url);
      } catch {
        // Keep the data URL if upload fails — the content is still usable
      }
    }),
  );

  return doc.body.innerHTML;
}
