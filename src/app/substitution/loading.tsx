import { PageSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return <PageSkeleton stats={4} cards={5} />;
}
