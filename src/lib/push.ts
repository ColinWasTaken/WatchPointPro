import { sendNotification, WebPushError } from "web-push";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/email";

// Web push. Each browser or installed app that turns notifications on gives us a subscription: a
// URL at its push service plus keys. To notify someone, each message is encrypted for each of their
// devices and posted to that URL; the push service wakes our service worker (public/sw.js), which
// shows it. Everything that appears under the bell is sent this way too (see notify.ts).

const MAX_DEVICES = 10;

export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

// The server posts to whatever URL a subscription names, so only the real push services are
// accepted: Google (Chrome, Android), Mozilla (Firefox), Apple (Safari), and Microsoft (Edge).
const PUSH_SERVICES = ["fcm.googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com"];

export type DeviceSubscription = { endpoint: string; p256dh: string; auth: string };

const base64url = (value: unknown, bytes: number) =>
  typeof value === "string" && /^[A-Za-z0-9_-]+$/.test(value) && Buffer.from(value, "base64url").length === bytes ? value : null;

// Checks what a browser's PushSubscription.toJSON() gives. Null if anything is off.
export function cleanSubscription(input: unknown): DeviceSubscription | null {
  if (!input || typeof input !== "object") return null;
  const { endpoint, keys } = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } | null };
  if (typeof endpoint !== "string" || endpoint.length > 1000) return null;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) return null;
  if (!PUSH_SERVICES.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
  const p256dh = base64url(keys?.p256dh, 65);
  const auth = base64url(keys?.auth, 16);
  return p256dh && auth ? { endpoint, p256dh, auth } : null;
}

// A name to tell someone's devices apart, from the browser's user agent.
export function deviceName(userAgent: string | null) {
  const ua = userAgent ?? "";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? "Android phone" : "Android tablet";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows computer";
  if (/CrOS/.test(ua)) return "Chromebook";
  if (/Linux/.test(ua)) return "Linux computer";
  return null;
}

// A browser can be handed from one account to another (sign out, sign in as someone else), so a
// device belongs to whoever turned notifications on last. Each person keeps their newest devices.
export async function saveSubscription(userId: string, sub: DeviceSubscription, device: string | null) {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, ...sub, device },
    update: { userId, p256dh: sub.p256dh, auth: sub.auth, device },
  });
  const extra = await prisma.pushSubscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: MAX_DEVICES,
    select: { id: true },
  });
  if (extra.length > 0) await prisma.pushSubscription.deleteMany({ where: { id: { in: extra.map((d) => d.id) } } });
}

export type PushMessage = { title: string; body?: string | null; url: string };

type Device = { id: string; endpoint: string; p256dh: string; auth: string };

// Push services contact this address if something is wrong with our messages. It must be https.
const contact = () => (appUrl().startsWith("https://") ? appUrl() : "https://watchpointpro.com");

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

type Delivery = "sent" | "gone" | "failed";

// Sends one message to one device. A device that no longer exists is forgotten ("gone").
async function deliver(device: Device, message: PushMessage): Promise<Delivery> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return "failed";
  // Push messages are limited to about 4 KB, so long titles and notes are shortened.
  const payload = JSON.stringify({ title: clip(message.title, 120), body: clip(message.body ?? "", 240), url: message.url });
  try {
    await sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, payload, {
      vapidDetails: { subject: contact(), publicKey, privateKey },
      TTL: 24 * 60 * 60, // a phone that's off for a day still gets it when it's back
      timeout: 10_000,
    });
    return "sent";
  } catch (err) {
    // 404 and 410 mean the device turned notifications off or the subscription expired.
    if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
      await prisma.pushSubscription.deleteMany({ where: { id: device.id } });
      return "gone";
    }
    console.error("Push failed", err instanceof WebPushError ? `${err.statusCode} ${err.body}` : err);
    return "failed";
  }
}

// Sends to every device of a user. Never throws.
export async function sendPush(userId: string, message: PushMessage) {
  try {
    if (!pushPublicKey()) return;
    const devices = await prisma.pushSubscription.findMany({ where: { userId } });
    await Promise.all(devices.map((d) => deliver(d, message)));
  } catch (err) {
    console.error("sendPush failed", err);
  }
}

// Sends to one of a user's devices, e.g. a test from settings.
export async function sendPushToDevice(userId: string, endpoint: string, message: PushMessage): Promise<Delivery> {
  const device = await prisma.pushSubscription.findFirst({ where: { userId, endpoint } });
  return device ? deliver(device, message) : "gone";
}
