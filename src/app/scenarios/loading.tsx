import { PageSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return <PageSkeleton stats={2} cards={5} />;
}
