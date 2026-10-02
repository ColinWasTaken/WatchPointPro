"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deletePhoto, savePhoto } from "@/lib/uploads";
import {
  companyEmployees,
  findClient,
  findProperty,
  getCompanyContext,
  requireCompanyAdmin,
} from "@/lib/authz";
import {
  cleanColor,
  cleanCoordinate,
  cleanEmail,
  cleanPhone,
  cleanText,
  cleanWebsite,
  cleanZip,
  fullAddress,
} from "@/lib/fields";

export type ActionState = { error?: string; success?: string };

type CompanyFields = {
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  serviceArea: string | null;
  address: string | null;
  brandColor: string | null;
};

function parseCompany(formData: FormData): CompanyFields | { error: string } {
  const name = cleanText(formData.get("name"), 100);
  if (!name) return { error: "Company name is required." };

  const phoneRaw = cleanText(formData.get("phone"), 30);
  const phone = phoneRaw ? cleanPhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: "Enter a valid phone number." };

  const emailRaw = cleanText(formData.get("email"), 254);
  const email = emailRaw ? cleanEmail(emailRaw) : null;
  if (emailRaw && !email) return { error: "Enter a valid company email." };

  const websiteRaw = cleanText(formData.get("website"), 200);
  const website = cleanWebsite(websiteRaw);
  if (websiteRaw && !website) return { error: "Enter a valid website address." };

  const colorRaw = cleanText(formData.get("brandColor"), 7);
  const brandColor = colorRaw ? cleanColor(colorRaw) : null;
  if (colorRaw && !brandColor) return { error: "Brand color must look like #6b8a63." };

  return {
    name,
    phone,
    email,
    website,
    serviceArea: cleanText(formData.get("serviceArea"), 200) || null,
    address: cleanText(formData.get("address"), 300) || null,
    brandColor,
  };
}

async function readImage(formData: FormData, key: string): Promise<string | null | "none"> {
  const file = formData.get(key);
  if (file instanceof File && file.size > 0) return savePhoto(file);
  return "none";
}

// A homewatcher with no company yet creates one (solo homewatchers get a one-person company).
export async function createCompanyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session || session.user.role !== "homewatcher") redirect("/login");
  if (await getCompanyContext(session.user.id)) redirect("/dashboard/homewatcher/company");

  const fields = parseCompany(formData);
  if ("error" in fields) return fields;

  let logoUrl: string | null = null;
  try {
    const logo = await readImage(formData, "logo");
    logoUrl = logo === "none" ? null : logo;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save logo." };
  }

  await prisma.company.create({
    data: { ...fields, logoUrl, members: { create: { userId: session.user.id, role: "admin" } } },
  });

  revalidatePath("/dashboard/homewatcher", "layout");
  redirect("/dashboard/homewatcher");
}

export async function updateCompanyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireCompanyAdmin();

  const fields = parseCompany(formData);
  if ("error" in fields) return fields;

  let logoUrl = ctx.company.logoUrl;
  try {
    const logo = await readImage(formData, "logo");
    if (logo !== "none") logoUrl = logo;
    else if (formData.get("removeLogo") === "on") logoUrl = null;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save logo." };
  }

  await prisma.company.update({ where: { id: ctx.company.id }, data: { ...fields, logoUrl } });
  if (logoUrl !== ctx.company.logoUrl) await deletePhoto(ctx.company.logoUrl);

  revalidatePath("/dashboard/homewatcher", "layout");
  return { success: "Company saved." };
}

// ---------- Clients ----------

type ClientFields = { firstName: string; lastName: string; email: string | null; phone: string | null };

function parseClient(formData: FormData): ClientFields | { error: string } {
  const firstName = cleanText(formData.get("firstName"), 80);
  const lastName = cleanText(formData.get("lastName"), 80);
  if (!firstName || !lastName) return { error: "First and last name are required." };

  const emailRaw = cleanText(formData.get("email"), 254);
  const email = emailRaw ? cleanEmail(emailRaw) : null;
  if (emailRaw && !email) return { error: "Enter a valid email address." };

  const phoneRaw = cleanText(formData.get("phone"), 30);
  const phone = phoneRaw ? cleanPhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: "Enter a valid phone number." };

  return { firstName, lastName, email, phone };
}

async function emailTaken(companyId: string, email: string | null, exceptId?: string) {
  if (!email) return false;
  const other = await prisma.client.findFirst({
    where: { companyId, email, ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
  return !!other;
}

export async function createClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireCompanyAdmin();

  const fields = parseClient(formData);
  if ("error" in fields) return fields;
  if (await emailTaken(ctx.company.id, fields.email)) {
    return { error: "You already have a client with that email." };
  }

  const client = await prisma.client.create({ data: { ...fields, companyId: ctx.company.id } });

  revalidatePath("/dashboard/homewatcher/clients");
  redirect(`/dashboard/homewatcher/clients/${client.id}`);
}

export async function updateClientAction(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireCompanyAdmin();
  const client = await findClient(ctx, clientId);
  if (!client) return { error: "Client not found." };

  const fields = parseClient(formData);
  if ("error" in fields) return fields;
  if (await emailTaken(ctx.company.id, fields.email, client.id)) {
    return { error: "You already have a client with that email." };
  }
  // A linked account is tied to its email; changing it would silently detach or mis-link the owner.
  if (client.userId && fields.email !== client.email) {
    return { error: "This client has a linked account, so their email can't be changed." };
  }

  await prisma.client.update({ where: { id: client.id }, data: fields });
  if (fields.email !== client.email) {
    // A pending invitation went to the old address; it must not be usable for the new one.
    await prisma.invitation.deleteMany({ where: { clientId: client.id, acceptedAt: null } });
  }

  revalidatePath("/dashboard/homewatcher/clients");
  revalidatePath(`/dashboard/homewatcher/clients/${client.id}`);
  return { success: "Client saved." };
}

export async function deleteClientAction(clientId: string) {
  const ctx = await requireCompanyAdmin();
  const client = await findClient(ctx, clientId);
  if (!client) return;

  // Properties (and their history) are never deleted implicitly; remove them first.
  const properties = await prisma.home.count({ where: { clientId: client.id } });
  if (properties > 0) return;

  await prisma.client.delete({ where: { id: client.id } });
  revalidatePath("/dashboard/homewatcher/clients");
  redirect("/dashboard/homewatcher/clients");
}

// ---------- Properties ----------

type PropertyFields = {
  nickname: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  assignedEmployeeId: string | null;
};

async function parseProperty(
  ctx: Awaited<ReturnType<typeof requireCompanyAdmin>>,
  formData: FormData,
): Promise<PropertyFields | { error: string }> {
  const street = cleanText(formData.get("street"), 150);
  const city = cleanText(formData.get("city"), 80);
  const state = cleanText(formData.get("state"), 30);
  const zip = cleanZip(formData.get("zip"));
  if (!street || !city || !state) return { error: "Street, city, and state are required." };
  if (!zip) return { error: "Enter a valid ZIP code (12345 or 12345-6789)." };

  const latitude = cleanCoordinate(formData.get("latitude"), 90);
  const longitude = cleanCoordinate(formData.get("longitude"), 180);
  if (latitude === "invalid" || longitude === "invalid") {
    return { error: "Latitude must be between -90 and 90, and longitude between -180 and 180." };
  }
  if ((latitude === null) !== (longitude === null)) {
    return { error: "Enter both latitude and longitude, or leave both blank." };
  }

  // Only members of this company can be assigned.
  const assigned = cleanText(formData.get("assignedEmployeeId"), 40);
  let assignedEmployeeId: string | null = null;
  if (assigned) {
    const employees = await companyEmployees(ctx);
    if (!employees.some((e) => e.id === assigned)) return { error: "Choose a valid team member." };
    assignedEmployeeId = assigned;
  }

  return {
    nickname: cleanText(formData.get("nickname"), 80) || street,
    street,
    city,
    state,
    zip,
    latitude,
    longitude,
    notes: cleanText(formData.get("notes"), 2000) || null,
    assignedEmployeeId,
  };
}

export async function createPropertyAction(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireCompanyAdmin();
  const client = await findClient(ctx, clientId);
  if (!client) return { error: "Client not found." };

  const fields = await parseProperty(ctx, formData);
  if ("error" in fields) return fields;

  let photoUrl: string | null = null;
  try {
    const photo = await readImage(formData, "photo");
    photoUrl = photo === "none" ? null : photo;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save photo." };
  }

  const home = await prisma.home.create({
    data: {
      ...fields,
      address: fullAddress(fields),
      photoUrl,
      companyId: ctx.company.id,
      clientId: client.id,
      // The owner account is linked later, when the client accepts their invitation.
      ownerId: client.userId,
    },
  });

  revalidatePath("/dashboard/homewatcher/clients");
  redirect(`/dashboard/homewatcher/properties/${home.id}`);
}

// The Properties page variant of createPropertyAction: the client comes from the form.
export async function createPropertyFromFormAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const clientId = cleanText(formData.get("clientId"), 40);
  if (!clientId) return { error: "Choose a client." };
  return createPropertyAction(clientId, _prev, formData);
}

export async function updatePropertyAction(
  homeId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireCompanyAdmin();
  const home = await findProperty(ctx, homeId);
  if (!home) return { error: "Property not found." };

  const fields = await parseProperty(ctx, formData);
  if ("error" in fields) return fields;

  let photoUrl = home.photoUrl;
  try {
    const photo = await readImage(formData, "photo");
    if (photo !== "none") photoUrl = photo;
    else if (formData.get("removePhoto") === "on") photoUrl = null;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save photo." };
  }

  await prisma.home.update({
    where: { id: home.id },
    data: { ...fields, address: fullAddress(fields), photoUrl },
  });
  if (photoUrl !== home.photoUrl) await deletePhoto(home.photoUrl);

  revalidatePath("/dashboard/homewatcher/clients");
  revalidatePath(`/dashboard/homewatcher/properties/${home.id}`);
  return { success: "Property saved." };
}

export async function deletePropertyAction(homeId: string) {
  const ctx = await requireCompanyAdmin();
  const home = await findProperty(ctx, homeId);
  if (!home) return;

  const reports = await prisma.report.findMany({ where: { homeId: home.id } });
  const photos = [home.photoUrl, ...reports.flatMap((r) => JSON.parse(r.photoUrls) as string[])];
  const clientId = home.clientId;

  await prisma.home.delete({ where: { id: home.id } });
  await Promise.all(photos.map((url) => deletePhoto(url)));

  revalidatePath("/dashboard/homewatcher/clients");
  redirect(clientId ? `/dashboard/homewatcher/clients/${clientId}` : "/dashboard/homewatcher/clients");
}
