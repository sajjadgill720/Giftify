import { InfoPage } from "../../components/info-page";
export default function Terms() {
  return (
    <InfoPage
      eyebrow="A CLEAR START"
      title="Preview store terms."
      intro="This is a product preview with sandbox payments. The conditions below describe what the current software can do."
      sections={[
        {
          title: "Test ordering, not live collection",
          text: "Live payment mode is disabled. Saved orders do not prove payment. A provider-verified sandbox transaction is recorded as a test payment; no real money or automatic shipment is represented as completed.",
        },
        {
          title: "Provisional prices and specifications",
          text: "Prices use integer PKR minor units and are calculated on the server. Quotes expire after fifteen minutes. Tax treatment, frame material details, outer dimensions, supplier quotes, and physical sample acceptance must be confirmed before live ordering.",
        },
        {
          title: "Artwork and approval",
          text: "You are responsible for checking the proof preview before approving. One wording revision is supported before production. Revision clears prior approval. Changes to product, size, finish, or template require a new quote.",
        },
        {
          title: "Delivery and refunds",
          text: "Domestic delivery is planned for the pilot cities. Dispatch estimates require supplier acceptance. Support requests do not create refunds or shipments. Refunds are recorded only from verified provider events and require the corresponding financial reconciliation.",
        },
        {
          title: "Working brand and launch prerequisites",
          text: "Keepsake is a working project brand; availability and rights have not been established. These preview terms do not replace the reviewed tax, consumer, supplier, privacy, and service agreements required for a public launch.",
        },
      ]}
    />
  );
}
