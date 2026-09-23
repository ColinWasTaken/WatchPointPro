import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export async function savePhoto(file: File): Promise<string | null> {
  if (file.size === 0) return null;
  if (!file.type.startsWith("image/")) {
    throw new Error("Photo must be an image file.");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Photo must be smaller than 5MB.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || "";
  const filename = `${randomUUID()}${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), bytes);

  return `/uploads/${filename}`;
}

export async function savePhotos(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const url = await savePhoto(file);
    if (url) urls.push(url);
  }
  return urls;
}
