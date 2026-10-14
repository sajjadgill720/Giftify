import Collection from "../../components/collection";
export const metadata = { title: "The collection · Keepsake" };
export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<{ occasion?: string }>;
}) {
  const { occasion } = await searchParams;
  return <Collection initialOccasion={occasion} />;
}
