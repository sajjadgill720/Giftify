import { InfoPage } from "../../components/info-page";
export default function Delivery() {
  return (
    <InfoPage
      eyebrow="FROM YOUR STORY TO YOUR SPACE"
      title="Proof first. Then production."
      intro="Clear steps and careful checks before your artwork leaves the studio."
      sections={[
        {
          title: "Where is domestic delivery available?",
          text: "The pilot checkout accepts delivery details for Islamabad, Rawalpindi, Lahore, and Karachi, Pakistan. International physical shipping is not offered. No courier shipment is created automatically by this preview store.",
        },
        {
          title: "When will my order be dispatched?",
          text: "A dispatch estimate is confirmed only after your proof approval, payment verification, and supplier acceptance. Supplier and courier agreements, packaging trials, and real delivery samples still need validation. No guaranteed delivery date is advertised.",
        },
        {
          title: "What exactly am I approving?",
          text: "You approve the checksum-bound PDF file shown on your order page. Check every name, date, and layout in that file. A browser artwork preview is useful for customization but does not replace the exact print PDF.",
        },
        {
          title: "How are production and quality checks recorded?",
          text: "An authenticated operator records supplier evidence as an order moves through the queue, printing, quality check, and ready-for-dispatch states. The production proof is locked after release.",
        },
        {
          title: "How will tracking appear?",
          text: "A carrier name, actual tracking reference, and supporting evidence are required for manual courier updates. Your order shows only the recorded state. A button click cannot create a delivered order without the required workflow and evidence.",
        },
        {
          title: "What if a parcel or artwork has a problem?",
          text: "Open the order and submit a delivery or support request. The team reviews the issue and records a response. Replacement or refund decisions require reconciliation and do not happen automatically from a support message.",
        },
      ]}
    />
  );
}
