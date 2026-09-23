"use client";

import { useActionState } from "react";
import { X, Plus, ListChecks } from "lucide-react";
import {
  addChecklistItemAction,
  deleteChecklistItemAction,
  type ActionState,
} from "@/lib/actions/checklist";

const initialState: ActionState = {};

type ChecklistItem = { id: string; label: string; order: number };

export function ChecklistEditor({
  homeId,
  items,
}: {
  homeId: string;
  items: ChecklistItem[];
}) {
  const addAction = addChecklistItemAction.bind(null, homeId);
  const [state, formAction, pending] = useActionState(addAction, initialState);

  return (
    <div className="mt-3 rounded-3xl bg-surface p-4 shadow-sm">
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">No checklist items yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl bg-accent-soft px-4 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-ink">
                <ListChecks className="h-4 w-4 text-accent" strokeWidth={2} />
                {item.label}
              </span>
              <form
                action={deleteChecklistItemAction.bind(null, homeId, item.id)}
              >
                <button
                  type="submit"
                  aria-label="Remove item"
                  className="text-ink-muted hover:text-danger"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="mt-3 flex gap-2">
        <input
          name="label"
          placeholder="Add a checklist item"
          className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1 rounded-xl bg-accent-soft px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-60"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add
        </button>
      </form>
      {state.error && <p className="mt-1 text-sm text-danger">{state.error}</p>}
    </div>
  );
}
