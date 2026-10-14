import { notFound } from "next/navigation";
import Product from "../../../components/product";
import { catalog } from "../../../../../packages/domain/src/index";
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = catalog.find((p) => p.id === slug);
  if (!product) notFound();
  return <Product product={product} />;
}
