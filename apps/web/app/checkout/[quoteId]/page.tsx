import Checkout from "../../../components/checkout";
export const metadata = { title: "Your keepsake checkout" };
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  return <Checkout quoteId={quoteId} />;
}
