import { notFound } from "next/navigation";
import Studio from "../../../components/studio";
import {
  catalog,
  sampleDesign,
} from "../../../../../packages/domain/src/index";
export const metadata = { title: "Your personal art studio · Keepsake" };
export default async function DesignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ size?: string; finish?: string; draft?: string }>;
}) {
  const { id } = await params;
  const p = catalog.find((p) => p.id === id);
  if (!p) notFound();
  const q = await searchParams;
  const design = sampleDesign(p.id);
  if (q.size === "A3" || q.size === "A4") design.size = q.size;
  if (q.finish === "oak" || q.finish === "black") design.finish = q.finish;
  return <Studio initial={design} draftId={q.draft} />;
}
