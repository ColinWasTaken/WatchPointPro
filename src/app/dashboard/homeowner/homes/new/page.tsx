import { BackLink } from "@/components/back-link";
import { AddHomeForm } from "./add-home-form";

export default function NewHomePage() {
  return (
    <div className="mx-auto max-w-lg">
      <BackLink href="/dashboard/homeowner" label="Back to your homes" />
      <h1 className="mt-4 text-2xl font-bold text-ink">Add a home</h1>
      <AddHomeForm />
    </div>
  );
}
