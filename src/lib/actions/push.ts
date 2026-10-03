"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cleanSubscription, deviceName, saveSubscription, sendPushToDevice } from "@/lib/push";

export type PushResult = { error?: string; expired?: boolean };

const SIGNED_OUT = "Please sign in again.";

function settingsChanged() {
  revalidatePath("/dashboard/homeowner/settings");
  revalidatePath("/dashboard/homewatcher/settings");
}

// Turns on push notifications for the device this comes from.
export async function savePushSubscriptionAction(subscription: unknown): Promise<PushResult> {
  const session = await auth();
  if (!session) return { error: SIGNED_OUT };
  const sub = cleanSubscription(subscription);
  if (!sub) return { error: "Notifications from this browser aren’t supported. Try Safari, Chrome, Firefox, or Edge." };
  await saveSubscription(session.user.id, sub, deviceName((await headers()).get("user-agent")));
  settingsChanged();
  return {};
}

// Signing out: this device stops getting the account's notifications. Nothing is refreshed, as the
// browser is about to leave the page.
export async function forgetDeviceAction(endpoint: unknown) {
  const session = await auth();
  if (!session || typeof endpoint !== "string") return;
  await prisma.pushSubscription.deleteMany({ where: { userId: session.user.id, endpoint } });
}

// Turns them off for one of the user's devices.
export async function removePushSubscriptionAction(endpoint: unknown): Promise<PushResult> {
  const session = await auth();
  if (!session) return { error: SIGNED_OUT };
  if (typeof endpoint !== "string") return {};
  await prisma.pushSubscription.deleteMany({ where: { userId: session.user.id, endpoint } });
  settingsChanged();
  return {};
}

export async function removeAllPushSubscriptionsAction(): Promise<PushResult> {
  const session = await auth();
  if (!session) return { error: SIGNED_OUT };
  await prisma.pushSubscription.deleteMany({ where: { userId: session.user.id } });
  settingsChanged();
  return {};
}

// A test notification to this device only.
export async function sendTestPushAction(endpoint: unknown): Promise<PushResult> {
  const session = await auth();
  if (!session) return { error: SIGNED_OUT };
  const result =
    typeof endpoint === "string"
      ? await sendPushToDevice(session.user.id, endpoint, {
          title: "Notifications are on",
          body: "Updates like completed home checks will appear here.",
          url: "/dashboard",
        })
      : "gone";
  if (result === "sent") return {};
  if (result === "gone") {
    settingsChanged();
    return { error: "Notifications on this device had expired. Turn them on again.", expired: true };
  }
  return { error: "The test couldn’t be sent. Try again in a minute." };
}
