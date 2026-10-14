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
          text: "The platform stores the photographs you choose to upload, your memory text, names, dates, locations, product choices, quotes, order status, recipient details, approvals and support requests. Original photographs are kept privately for authorized order review. Metadata such as EXIF location information can remain in originals; normalized print images and customer previews have unnecessary metadata stripped. Audio and identity documents are not requested.",
        },
        {
          title: "Who can access my order?",
          text: "Your browser receives an HttpOnly purchaser cookie. Its access token is hashed in the database and expires after seven days. A verified account can link a current guest session. After linking, standalone guest access is disabled and account ownership policies govern cross-device access. Access/refresh tokens stay in HttpOnly cookies. Authenticated operations staff can access orders to review proofs and handle production and support.",
        },
        {
          title: "Where are drafts and proofs stored?",
          text: "Studio edits are kept locally and autosaved privately. Photos are stored outside the public website directory in local development, or in a private Supabase bucket when configured for deployment. Customer photo derivatives are capped at 640 pixels; proofs are watermarked JPEGs. Only authorized operators can retrieve order originals or production PDFs, and access is audited. A preview displayed in a browser can still be captured.",
        },
        {
          title: "Is my content used for advertising or AI training?",
          text: "Uploaded photos and written memories are not sent to an AI generation service or published in galleries or advertising. No public sharing is enabled. Any future use for these purposes would need a separate consent workflow.",
        },
        {
          title: "How can I request deletion?",
          text: "Delete an unfinished saved design from My keepsakes to archive it. Archiving removes it from your active designs; it does not erase purchased snapshots or implement a full personal-data erasure request. For full deletion, send an order support request. An operator must review accounting and production obligations. Automatic retention jobs and finalized retention policies remain launch prerequisites.",
        },
        {
          title: "What external services are involved?",
          text: "When configured, Supabase provides authentication and private storage, and Safepay provides hosted test checkout. Searching for a place sends the search words to MapTiler; applying a map sends its coordinates, style and zoom to MapTiler. Photos and personal messages are not sent to that map provider. Map features remain disabled until credentials and commercial printing rights are configured. Supplier and courier integrations remain manual.",
        },
      ]}
    />
  );
}
