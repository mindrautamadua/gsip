import { EntityModal } from "@/components/entities/EntityModal";
import { EntityDetailContent } from "@/components/entities/EntityDetailContent";

export const revalidate = 0;

// Intercepts /entities/[slug] when navigated from the entities list → renders
// the detail inside a modal. Direct load / refresh falls through to the full page.
export default async function InterceptedEntityModal({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <EntityModal>
      <EntityDetailContent slug={slug} variant="modal" />
    </EntityModal>
  );
}
