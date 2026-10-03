import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";

// Inspection photos and videos live in a private bucket. The browser uploads straight to storage
// with a one-time signed URL, so large files never pass through our server (Vercel caps requests
// at 4.5 MB), and viewers get short-lived signed read URLs after a permission check.

export { MEDIA_LIMITS } from "@/lib/media-limits";

export const MEDIA_BUCKET = "inspection-media";
const READ_URL_SECONDS = 60 * 60;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/3gpp": "3gp",
};

export type MediaKind = "photo" | "video";

export function mediaKind(contentType: string): MediaKind | null {
  if (/^image\/[\w.+-]+$/.test(contentType)) return "photo";
  if (/^video\/[\w.+-]+$/.test(contentType)) return "video";
  return null;
}

// Media paths are always inspections/<inspection id>/<uuid>.<ext>.
export const isMediaPathFor = (inspectionId: string, path: string) =>
  path.startsWith(`inspections/${inspectionId}/`) &&
  /^[0-9a-f-]{36}\.[a-z0-9]+$/.test(path.slice(`inspections/${inspectionId}/`.length));

let bucketReady: Promise<void> | null = null;

// The bucket is created on first use if it's missing (private, media types only, 50 MB cap).
function ensureBucket() {
  bucketReady ??= (async () => {
    const { data } = await supabaseAdmin.storage.getBucket(MEDIA_BUCKET);
    if (data) return;
    const { error } = await supabaseAdmin.storage.createBucket(MEDIA_BUCKET, {
      public: false,
      fileSizeLimit: "50MB",
      allowedMimeTypes: ["image/*", "video/*"],
    });
    if (error && !/already exists/i.test(error.message)) {
      bucketReady = null;
      throw error;
    }
  })();
  return bucketReady;
}

export async function createMediaUpload(inspectionId: string, contentType: string) {
  await ensureBucket();
  const path = `inspections/${inspectionId}/${randomUUID()}.${EXTENSIONS[contentType] ?? "bin"}`;
  const { data, error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error) throw error;
  return { path, uploadUrl: data.signedUrl };
}

// What actually landed in storage at path, or null if nothing did.
export async function mediaObjectInfo(path: string) {
  const { data, error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).info(path);
  if (error || !data) return null;
  return { size: Number(data.size ?? 0), contentType: String(data.contentType ?? "") };
}

export async function signMediaUrls(paths: string[]) {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data } = await supabaseAdmin.storage.from(MEDIA_BUCKET).createSignedUrls(paths, READ_URL_SECONDS);
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
  }
  return urls;
}

export async function removeMedia(paths: string[]) {
  if (paths.length > 0) await supabaseAdmin.storage.from(MEDIA_BUCKET).remove(paths);
}

// Everything stored for an inspection, including uploads that were never attached to an item.
export async function removeInspectionMedia(inspectionId: string) {
  const prefix = `inspections/${inspectionId}`;
  const { data } = await supabaseAdmin.storage.from(MEDIA_BUCKET).list(prefix, { limit: 1000 });
  await removeMedia((data ?? []).map((file) => `${prefix}/${file.name}`));
}
