import { InfoPage } from "../../components/info-page";
export default function Privacy() {
  return (
    <InfoPage
      eyebrow="YOUR STORY STAYS YOURS"
      title="Personal, and kept private."
      intro="A plain-language description of the current preview store’s data handling. Final launch policies remain subject to review."
      sections={[
        {
          title: "What is saved?",
          text: "The platform stores your artwork wording, product choices, server quotes, order status, submitted recipient name, phone number and domestic address, proof approvals, and support requests. No photographs, audio, CNIC, or unrelated recipient information is requested in this milestone.",
        },
        {
          title: "Who can access my order?",
          text: "Your browser receives an HttpOnly purchaser cookie. Its access token is hashed in the database and expires after seven days. Ownership policies restrict access to your records. Authenticated operations staff can access orders to review proofs and handle production and support.",
        },
        {
          title: "Where are drafts and proofs stored?",
          text: "Studio drafts are kept locally and can be saved to the private database. Print PDFs are private database records. An optional configured Supabase private bucket can mirror immutable proof files; no public proof URL is issued.",
        },
        {
          title: "Is my content used for advertising or AI training?",
          text: "This milestone does not send customer content to an AI generation service or publish it for marketing. Customer photos and audio are not accepted. Additional purposes would require a separately defined and authorized workflow.",
        },
        {
          title: "How can I request deletion?",
          text: "Send an order support request describing the deletion you need. An operator must review it against any required accounting or production records. Automatic retention/deletion jobs and finalized record-retention policies are launch prerequisites, so no automatic deletion period is promised here.",
        },
        {
          title: "What external services are involved?",
          text: "When configured, Supabase provides authentication and private storage, and Safepay provides hosted test checkout. Payment credentials are never exposed to the browser. Supplier and courier integrations remain manual, and only necessary fulfillment details should be shared under reviewed agreements.",
        },
      ]}
    />
  );
}
