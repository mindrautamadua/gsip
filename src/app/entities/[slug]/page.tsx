import { EntityDetailContent } from "@/components/entities/EntityDetailContent";

export const revalidate = 0;

export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <EntityDetailContent slug={slug} variant="page" />;
}
