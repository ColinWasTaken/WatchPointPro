import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/back-link";
import { EditHomeForm } from "./edit-home-form";

export default async function EditHomePage(
  props: PageProps<"/dashboard/homeowner/homes/[homeId]/edit">,
) {
  const { homeId } = await props.params;
  const session = await auth();
  if (!session) redirect("/login");

  const home = await prisma.home.findUnique({ where: { id: homeId } });
  if (!home || home.ownerId !== session.user.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-lg">
      <BackLink href={`/dashboard/homeowner/homes/${homeId}`} label={`Back to ${home.nickname}`} />
      <h1 className="mt-4 text-2xl font-bold text-ink">Edit home</h1>
      <EditHomeForm
        homeId={home.id}
        nickname={home.nickname}
        address={home.address}
        notes={home.notes ?? ""}
        photoUrl={home.photoUrl}
      />
    </div>
  );
}
