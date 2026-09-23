import { randomUUID } from "node:crypto";
import path from "node:path";
import { supabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabase";

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

  const { error } = await supabaseAdmin.storage
    .from(PHOTOS_BUCKET)
    .upload(filename, bytes, { contentType: file.type });

  if (error) {
    throw new Error("Could not upload photo. Please try again.");
  }

  const { data } = supabaseAdmin.storage.from(PHOTOS_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

export async function savePhotos(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const url = await savePhoto(file);
    if (url) urls.push(url);
  }
  return urls;
}

// Removes a previously uploaded photo. Ignores URLs that aren't in our bucket.
export async function deletePhoto(url: string | null) {
  if (!url) return;
  const marker = `/storage/v1/object/public/${PHOTOS_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;
  const objectPath = decodeURIComponent(url.slice(index + marker.length));
  await supabaseAdmin.storage.from(PHOTOS_BUCKET).remove([objectPath]);
}
