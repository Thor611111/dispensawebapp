// Client-side image compression for receipt scans.
// Riduce dimensione/peso per evitare timeout dell'AI.
export async function compressImage(
  file: File,
  opts: { maxSize?: number; quality?: number } = {},
): Promise<{ base64: string; blob: Blob; width: number; height: number }> {
  const maxSize = opts.maxSize ?? 1600;
  const quality = opts.quality ?? 0.8;

  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

  const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { base64: dataUrl, blob: file, width: img.width, height: img.height };
  }
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob = await new Promise((res) => {
    canvas.toBlob((b) => res(b ?? file), "image/jpeg", quality);
  });
  const base64 = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
  return { base64, blob, width: w, height: h };
}
