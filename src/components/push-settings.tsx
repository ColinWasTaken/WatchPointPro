"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { BellRing } from "lucide-react";
import {
  forgetDeviceAction,
  removeAllPushSubscriptionsAction,
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
} from "@/lib/actions/push";

// Push notifications on the device in use: needs the service worker (registered in production),
// the browser's permission, and a subscription saved on the server (src/lib/push.ts).

type Status = "checking" | "unsupported" | "install" | "blocked" | "off" | "on";
type Found = { status: Status; registration?: ServiceWorkerRegistration; subscription?: PushSubscription };

const toBytes = (base64url: string) =>
  Uint8Array.from(atob(base64url.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

// iPhones and iPads only allow notifications from apps added to the Home Screen.
const needsInstall = () =>
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) &&
  !matchMedia("(display-mode: standalone)").matches &&
  (navigator as { standalone?: boolean }).standalone !== true;

async function detect(publicKey: string): Promise<Found> {
  if (needsInstall()) return { status: "install" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return { status: "unsupported" };
  // On a first visit the service worker may still be installing, so give it a moment. (In
  // development there is none.)
  const registration =
    (await navigator.serviceWorker.getRegistration()) ??
    (await Promise.race([navigator.serviceWorker.ready, new Promise<undefined>((resolve) => setTimeout(resolve, 5000))]));
  if (!registration) return { status: "unsupported" };
  if (Notification.permission === "denied") return { status: "blocked", registration };
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription || Notification.permission !== "granted") return { status: "off", registration };
  // Made with an older key, it can't receive anything now: start over.
  const key = subscription.options.applicationServerKey;
  if (key && new Uint8Array(key).join() !== toBytes(publicKey).join()) {
    await subscription.unsubscribe();
    return { status: "off", registration };
  }
  return { status: "on", registration, subscription };
}

// Signing out: this device stops getting the account's notifications.
export async function forgetThisDevice() {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const subscription = await registration?.pushManager?.getSubscription();
    if (!subscription) return;
    await Promise.race([
      Promise.allSettled([forgetDeviceAction(subscription.endpoint), subscription.unsubscribe()]),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch {}
}

const primary =
  "rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60";
const secondary =
  "rounded-full bg-accent-soft px-5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-60";

const listNames = (names: string[]) =>
  names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

export function PushSettings({ publicKey, devices }: { publicKey: string; devices: { endpoint: string; device: string | null }[] }) {
  const [status, setStatus] = useState<Status>("checking");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error?: string; done?: string } | null>(null);
  const registration = useRef<ServiceWorkerRegistration | null>(null);

  const detected = useEffectEvent((found: Found) => {
    registration.current = found.registration ?? null;
    // The server has the final say: if this device was turned off from another one, its
    // subscription expired, or it belongs to someone who signed out here, the browser's copy is stale.
    if (found.subscription && !devices.some((d) => d.endpoint === found.subscription?.endpoint)) {
      found.subscription.unsubscribe().catch(() => {});
      setStatus("off");
      return;
    }
    setStatus(found.status);
    setEndpoint(found.subscription?.endpoint ?? null);
  });
  useEffect(() => {
    detect(publicKey).then((found) => detected(found));
  }, [publicKey]);

  async function turnOn() {
    if (!registration.current) return;
    setBusy(true);
    setMessage(null);
    try {
      // Called straight from the tap: this is also what asks for permission.
      const subscription = await registration.current.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toBytes(publicKey),
      });
      const result = await savePushSubscriptionAction(subscription.toJSON());
      if (result.error) {
        await subscription.unsubscribe();
        setMessage({ error: result.error });
        return;
      }
      setEndpoint(subscription.endpoint);
      setStatus("on");
    } catch {
      if (Notification.permission === "denied") setStatus("blocked");
      else if (Notification.permission === "granted") setMessage({ error: "Notifications couldn’t be turned on. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setMessage(null);
    try {
      const subscription = await registration.current?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setEndpoint(null);
      setStatus("off");
    } catch {
      setMessage({ error: "Notifications couldn’t be turned off. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function turnOffEverywhere() {
    setBusy(true);
    setMessage(null);
    try {
      await removeAllPushSubscriptionsAction();
      const subscription = await registration.current?.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        setEndpoint(null);
        setStatus("off");
      }
      setMessage({ done: "Notifications are off on all your devices." });
    } catch {
      setMessage({ error: "Notifications couldn’t be turned off. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!endpoint) return;
    setBusy(true);
    setMessage(null);
    const result = await sendTestPushAction(endpoint).catch(() => ({ error: "The test couldn’t be sent. Check your connection.", expired: false }));
    if (result.expired) {
      // The server has forgotten this device, so the browser's subscription is no use either.
      await (await registration.current?.pushManager.getSubscription())?.unsubscribe().catch(() => {});
      setEndpoint(null);
      setStatus("off");
    }
    setMessage(result.error ? { error: result.error } : { done: "Sent. It should arrive in a few seconds." });
    setBusy(false);
  }

  const others = devices.filter((d) => d.endpoint !== endpoint);
  const otherNames = [...new Set(others.map((d) => d.device).filter((n): n is string => Boolean(n)))];

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-ink-muted">
        Get an alert on this phone or computer when something new appears under the bell, like a completed home check or an
        update on an issue.
      </p>

      {status === "on" && (
        <>
          <p className="flex items-center gap-2 font-semibold text-accent">
            <BellRing className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            On for this device
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={sendTest} disabled={busy} className={secondary}>
              Send a test
            </button>
            <button type="button" onClick={turnOff} disabled={busy} className={secondary}>
              Turn off
            </button>
          </div>
        </>
      )}
      {status === "off" && (
        <button type="button" onClick={turnOn} disabled={busy} className={`self-start ${primary}`}>
          {busy ? "Turning on…" : "Turn on notifications"}
        </button>
      )}
      {status === "blocked" && (
        <p className="text-ink">
          Notifications are blocked for this site in your browser’s settings. Allow them there, then come back here to turn them
          on.
        </p>
      )}
      {status === "install" && (
        <p className="text-ink">
          On iPhone and iPad, add WatchPointPro to your Home Screen first: tap the Share button, then Add to Home Screen. Open it
          from there and turn notifications on.
        </p>
      )}
      {status === "unsupported" && <p className="text-ink">This browser can’t show notifications from websites.</p>}

      {others.length > 0 && (
        <p className="text-ink-muted">
          {status === "on" ? "Also on for" : "On for"} {others.length === 1 ? "1 other device" : `${others.length} other devices`}
          {otherNames.length > 0 && `: ${listNames(otherNames)}`}.{" "}
          <button type="button" onClick={turnOffEverywhere} disabled={busy} className="font-semibold text-accent disabled:opacity-60">
            Turn off everywhere
          </button>
        </p>
      )}

      {message?.error && (
        <p role="alert" className="text-danger">
          {message.error}
        </p>
      )}
      {message?.done && (
        <p role="status" className="text-accent">
          {message.done}
        </p>
      )}
    </div>
  );
}

// A nudge on the notifications page, only where notifications could be turned on but aren't.
export function PushHint({ publicKey, settingsHref }: { publicKey: string; settingsHref: string }) {
  const [status, setStatus] = useState<Status>("checking");
  useEffect(() => {
    detect(publicKey).then((found) => setStatus(found.status));
  }, [publicKey]);
  if (status !== "off" && status !== "install") return null;
  return (
    <p className="mt-6 text-center text-sm text-ink-muted">
      Want these on your phone?{" "}
      <Link href={settingsHref} className="font-semibold text-accent">
        Turn on notifications in Settings
      </Link>
    </p>
  );
}
