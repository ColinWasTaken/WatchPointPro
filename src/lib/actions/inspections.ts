"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findProperty, inspectionScope, isAdmin, requireCompany, type CompanyContext } from "@/lib/authz";
import { appUrl, emails } from "@/lib/email";
import { notify } from "@/lib/notify";
import { inspectionOutcome, isItemStatus } from "@/lib/inspection-template";
import { companyChecklist } from "@/lib/checklist";
import { recordIssues } from "@/lib/issues";
import {
  MEDIA_LIMITS,
  createMediaUpload,
  isMediaPathFor,
  mediaKind,
  mediaObjectInfo,
  removeInspectionMedia,
  removeMedia,
  signMediaUrls,
} from "@/lib/media";

// Home checks are edited live: every tap, note, and upload is saved as it happens, so a check can
// be closed and resumed. Each action re-checks that the member can see the property and that the
// check is still a draft.

export type SaveResult = { error?: string };

const hw = "/dashboard/homewatcher";
const LOCKED = "This check was submitted or is no longer available.";

const findDraftItem = (ctx: CompanyContext, itemId: string) =>
  prisma.inspectionItem.findFirst({ where: { id: itemId, inspection: { ...inspectionScope(ctx), status: "draft" } } });

export async function startInspectionAction(homeId: string) {
  const ctx = await requireCompany();
  const home = await findProperty(ctx, homeId);
  if (!home) redirect(`${hw}/properties`);

  // One check in progress per property: continue it rather than starting a second.
  const open = await prisma.inspection.findFirst({ where: { homeId: home.id, status: "draft" }, orderBy: { startedAt: "asc" } });
  if (open) redirect(`${hw}/inspections/${open.id}`);

  const { items } = await companyChecklist(ctx.company.id);
  const created = await prisma.inspection.create({
    data: {
      companyId: ctx.company.id,
      homeId: home.id,
      inspectorId: ctx.userId,
      items: {
        create: items.map((t, position) => ({
          key: t.key,
          label: t.label,
          readingUnit: t.readingUnit ?? null,
          position,
        })),
      },
    },
  });
  // If two people started at the same moment, keep the earlier check.
  const first = await prisma.inspection.findFirst({ where: { homeId: home.id, status: "draft" }, orderBy: { startedAt: "asc" } });
  if (first && first.id !== created.id) {
    await prisma.inspection.delete({ where: { id: created.id } });
    redirect(`${hw}/inspections/${first.id}`);
  }
  revalidatePath(`${hw}/properties/${home.id}`);
  redirect(`${hw}/inspections/${created.id}`);
}

export async function saveInspectionItemAction(
  itemId: string,
  patch: { status?: string; note?: string; reading?: string },
): Promise<SaveResult> {
  const ctx = await requireCompany();
  const item = await findDraftItem(ctx, itemId);
  if (!item) return { error: LOCKED };

  const data: Prisma.InspectionItemUpdateInput = {};
  if (patch.status !== undefined) {
    if (!isItemStatus(patch.status)) return { error: "Unknown status." };
    data.status = patch.status;
  }
  if (patch.note !== undefined) data.note = String(patch.note).trim().slice(0, 2000) || null;
  if (patch.reading !== undefined) {
    if (!item.readingUnit) return { error: "This item doesn't take a reading." };
    const raw = String(patch.reading).trim();
    const value = Number(raw);
    if (raw && (!Number.isFinite(value) || Math.abs(value) > 100000)) return { error: "Enter a number." };
    data.reading = raw ? value : null;
  }

  await prisma.inspectionItem.update({ where: { id: item.id }, data });
  return {};
}

export async function saveInspectionSummaryAction(inspectionId: string, summary: string): Promise<SaveResult> {
  const ctx = await requireCompany();
  const saved = await prisma.inspection.updateMany({
    where: { id: inspectionId, ...inspectionScope(ctx), status: "draft" },
    data: { summary: String(summary).trim().slice(0, 4000) || null },
  });
  return saved.count === 1 ? {} : { error: LOCKED };
}

// Step 1 of adding a photo or video: a one-time URL the browser uploads the file to directly.
export async function createMediaUploadAction(
  itemId: string,
  file: { contentType: string; size: number },
): Promise<{ error: string } | { path: string; uploadUrl: string }> {
  const ctx = await requireCompany();
  const item = await findDraftItem(ctx, itemId);
  if (!item) return { error: LOCKED };

  const kind = mediaKind(String(file.contentType));
  if (!kind) return { error: "Only photos and videos can be added." };
  if (!(Number(file.size) > 0)) return { error: "That file is empty." };
  if (Number(file.size) > MEDIA_LIMITS[kind]) {
    return { error: kind === "video" ? "Videos can be up to 50 MB (about 30 seconds)." : "Photos can be up to 20 MB." };
  }
  return createMediaUpload(item.inspectionId, file.contentType);
}

// Step 2: attach what was uploaded, after checking what actually landed in storage.
export async function registerMediaAction(
  itemId: string,
  path: string,
): Promise<{ error: string } | { media: { id: string; kind: "photo" | "video"; url: string } }> {
  const ctx = await requireCompany();
  const item = await findDraftItem(ctx, itemId);
  if (!item) return { error: LOCKED };
  if (!isMediaPathFor(item.inspectionId, String(path))) return { error: "Upload not found." };

  const info = await mediaObjectInfo(path);
  const kind = info ? mediaKind(info.contentType) : null;
  if (!info || !kind) return { error: "Upload not found." };
  if (info.size > MEDIA_LIMITS[kind]) {
    await removeMedia([path]);
    return { error: "That file is too large." };
  }

  try {
    const media = await prisma.inspectionMedia.create({
      data: { inspectionId: item.inspectionId, itemId: item.id, kind, path, contentType: info.contentType, size: info.size },
    });
    const urls = await signMediaUrls([path]);
    return { media: { id: media.id, kind, url: urls.get(path) ?? "" } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { error: "Already added." };
    throw err;
  }
}

export async function deleteMediaAction(mediaId: string): Promise<SaveResult> {
  const ctx = await requireCompany();
  const media = await prisma.inspectionMedia.findFirst({
    where: { id: mediaId, inspection: { ...inspectionScope(ctx), status: "draft" } },
  });
  if (!media) return { error: LOCKED };

  await prisma.inspectionMedia.delete({ where: { id: media.id } });
  await removeMedia([media.path]);
  return {};
}

// Finalizes the check, makes it visible to the homeowner, and notifies them.
export async function submitInspectionAction(inspectionId: string, summary: string): Promise<SaveResult> {
  const ctx = await requireCompany();
  const draft = await prisma.inspection.findFirst({
    where: { id: inspectionId, ...inspectionScope(ctx), status: "draft" },
    include: { items: true, home: true },
  });
  if (!draft) return { error: LOCKED };
  if (!draft.items.some((i) => i.status && i.status !== "not_checked")) {
    return { error: "Mark at least one item before submitting." };
  }

  const submitted = await prisma.$transaction(async (tx) => {
    const done = await tx.inspection.updateMany({
      where: { id: draft.id, status: "draft" },
      data: {
        status: "submitted",
        submittedAt: new Date(),
        inspectorId: ctx.userId,
        summary: String(summary).trim().slice(0, 4000) || null,
      },
    });
    if (done.count !== 1) return false;
    // Anything left unmarked is reported as not checked; problems become issues to track.
    await tx.inspectionItem.updateMany({ where: { inspectionId: draft.id, status: null }, data: { status: "not_checked" } });
    await recordIssues(tx, draft, ctx.userId);
    return true;
  }, { timeout: 20000 });
  if (!submitted) return { error: LOCKED };

  const home = draft.home;
  const place = home.street ?? home.nickname;
  const outcome = inspectionOutcome(draft.items);
  const link = `/dashboard/homeowner/homes/${home.id}/inspections/${draft.id}`;
  await notify(
    home.ownerId,
    { type: "inspection_submitted", title: `Your home check at ${place} has been completed`, body: outcome.sentence, link },
    emails.inspectionCompleted(ctx.company, place, outcome.sentence, `${appUrl()}${link}`),
  );

  revalidatePath(`${hw}/properties/${home.id}`);
  revalidatePath(hw, "layout");
  revalidatePath("/dashboard/homeowner", "layout");
  redirect(`${hw}/inspections/${draft.id}`);
}

// Throws away a check in progress. Admins can discard any; others only checks they started.
export async function discardInspectionAction(inspectionId: string): Promise<SaveResult> {
  const ctx = await requireCompany();
  const draft = await prisma.inspection.findFirst({ where: { id: inspectionId, ...inspectionScope(ctx), status: "draft" } });
  if (!draft) return { error: LOCKED };
  if (!isAdmin(ctx) && draft.inspectorId !== ctx.userId) return { error: "Only an admin or whoever started this check can discard it." };

  await prisma.inspection.delete({ where: { id: draft.id } });
  await removeInspectionMedia(draft.id);
  revalidatePath(`${hw}/properties/${draft.homeId}`);
  redirect(`${hw}/properties/${draft.homeId}`);
}
