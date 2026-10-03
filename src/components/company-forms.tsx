"use client";

import { useActionState, type ReactNode } from "react";
import { Camera } from "lucide-react";
import type { ActionState } from "@/lib/actions/company";
import { BrandColorField } from "./brand-color-field";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const inputClass =
  "rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-accent";
const labelClass = "flex flex-col gap-1 text-sm font-semibold text-ink";
const fileClass =
  "w-full text-sm text-ink-muted file:mr-2 file:rounded-full file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:text-xs file:font-semibold file:text-accent";

function FormShell({
  action,
  submitLabel,
  children,
}: {
  action: Action;
  submitLabel: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-3xl bg-surface p-6 shadow-sm">
      {children}
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-accent">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function ImageField({ name, label }: { name: string; label: string }) {
  return (
    <label className={labelClass}>
      {label}
      <span className="flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-normal text-ink-muted">
        <Camera className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        <input name={name} type="file" accept="image/*" className={fileClass} />
      </span>
    </label>
  );
}

export function CompanyForm({
  action,
  submitLabel,
  company,
}: {
  action: Action;
  submitLabel: string;
  company?: {
    name: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    serviceArea: string | null;
    address: string | null;
    brandColor: string | null;
    logoUrl: string | null;
  };
}) {
  return (
    <FormShell action={action} submitLabel={submitLabel}>
      <label className={labelClass}>
        Company name
        <input name="name" required defaultValue={company?.name} placeholder="Coastal Home Watch" className={inputClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Phone
          <input name="phone" type="tel" defaultValue={company?.phone ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Email
          <input name="email" type="email" defaultValue={company?.email ?? ""} className={inputClass} />
        </label>
      </div>
      <label className={labelClass}>
        Website
        <input name="website" defaultValue={company?.website ?? ""} placeholder="coastalhomewatch.com" className={inputClass} />
      </label>
      <label className={labelClass}>
        Service area
        <input name="serviceArea" defaultValue={company?.serviceArea ?? ""} placeholder="Naples, Marco Island, Bonita Springs" className={inputClass} />
      </label>
      <label className={labelClass}>
        Company address
        <input name="address" defaultValue={company?.address ?? ""} className={inputClass} />
      </label>
      <BrandColorField defaultValue={company?.brandColor ?? ""} companyName={company?.name ?? "Your company"} logoUrl={company?.logoUrl ?? null} />
      {company?.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={company.logoUrl} alt="Company logo" className="h-16 w-16 rounded-2xl object-cover" />
      )}
      <ImageField name="logo" label={company?.logoUrl ? "Replace logo" : "Logo (optional)"} />
      {company?.logoUrl && (
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" name="removeLogo" /> Remove current logo
        </label>
      )}
    </FormShell>
  );
}

export function ClientForm({
  action,
  submitLabel,
  client,
}: {
  action: Action;
  submitLabel: string;
  client?: { firstName: string; lastName: string; email: string | null; phone: string | null };
}) {
  return (
    <FormShell action={action} submitLabel={submitLabel}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          First name
          <input name="firstName" required defaultValue={client?.firstName} className={inputClass} />
        </label>
        <label className={labelClass}>
          Last name
          <input name="lastName" required defaultValue={client?.lastName} className={inputClass} />
        </label>
      </div>
      <label className={labelClass}>
        Email
        <input name="email" type="email" defaultValue={client?.email ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        Phone
        <input name="phone" type="tel" defaultValue={client?.phone ?? ""} className={inputClass} />
      </label>
    </FormShell>
  );
}

export function PropertyForm({
  action,
  submitLabel,
  employees,
  clients,
  property,
}: {
  action: Action;
  submitLabel: string;
  employees: { id: string; name: string }[];
  // When given, the form asks which client the property belongs to.
  clients?: { id: string; name: string }[];
  property?: {
    nickname: string;
    street: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    latitude: number | null;
    longitude: number | null;
    notes: string | null;
    photoUrl: string | null;
    assignedEmployeeId: string | null;
  };
}) {
  return (
    <FormShell action={action} submitLabel={submitLabel}>
      {clients && (
        <label className={labelClass}>
          Client
          <select name="clientId" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choose a client
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className={labelClass}>
        Nickname (optional)
        <input name="nickname" defaultValue={property?.nickname} placeholder="e.g. Palm Ave house" className={inputClass} />
      </label>
      <label className={labelClass}>
        Street address
        <input name="street" required defaultValue={property?.street ?? ""} placeholder="123 Palm Ave" className={inputClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelClass}>
          City
          <input name="city" required defaultValue={property?.city ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          State
          <input name="state" required defaultValue={property?.state ?? ""} placeholder="FL" className={inputClass} />
        </label>
        <label className={labelClass}>
          ZIP
          <input name="zip" required inputMode="numeric" defaultValue={property?.zip ?? ""} className={inputClass} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Latitude (optional)
          <input name="latitude" inputMode="decimal" defaultValue={property?.latitude ?? ""} placeholder="26.1420" className={inputClass} />
        </label>
        <label className={labelClass}>
          Longitude (optional)
          <input name="longitude" inputMode="decimal" defaultValue={property?.longitude ?? ""} placeholder="-81.7948" className={inputClass} />
        </label>
      </div>
      <label className={labelClass}>
        Assigned team member (optional)
        <select name="assignedEmployeeId" defaultValue={property?.assignedEmployeeId ?? ""} className={inputClass}>
          <option value="">Unassigned</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
      {property?.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={property.photoUrl} alt="Property" className="h-32 w-full rounded-2xl object-cover" />
      )}
      <ImageField name="photo" label={property?.photoUrl ? "Replace photo" : "Photo (optional)"} />
      {property?.photoUrl && (
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" name="removePhoto" /> Remove current photo
        </label>
      )}
      <label className={labelClass}>
        Notes
        <textarea name="notes" rows={4} defaultValue={property?.notes ?? ""} placeholder="Gate codes, alarm info, pets…" className={inputClass} />
      </label>
    </FormShell>
  );
}

// Sends (or re-sends) a client's WatchPointPro invitation and reports the result inline.
export function SendInvitationButton({ action, label }: { action: () => Promise<ActionState>; label: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Sending…" : label}
      </button>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-accent">{state.success}</p>}
    </form>
  );
}

export function InviteMemberForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-3xl bg-surface p-5 shadow-sm">
      <h2 className="font-bold text-ink">Invite a team member</h2>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input name="email" type="email" required placeholder="name@example.com" aria-label="Email" className={`${inputClass} flex-1`} />
        <select name="role" defaultValue="employee" aria-label="Role" className={inputClass}>
          <option value="employee">Team member</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <p className="text-xs text-ink-muted">
        Team members see the properties assigned to them. Admins also manage clients, properties, and the team.
      </p>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-accent">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send invitation"}
      </button>
    </form>
  );
}
