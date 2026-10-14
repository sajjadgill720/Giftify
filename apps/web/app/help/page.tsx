import { InfoPage } from "../../components/info-page";
export default function Help() {
  return (
    <InfoPage
      eyebrow="HERE TO MAKE IT SIMPLE"
      title="A thoughtful gift, simply."
      intro="Everything you need to know about creating a keepsake and approving your artwork."
      sections={[
        {
          title: "How do I create my personal artwork?",
          text: "Choose a design, add your headline, message, and date in the studio, then choose A4 or A3 and a frame finish. Review your details and request a server-issued price quote. You can save a draft and return in the same browser.",
        },
        {
          title: "What happens after checkout?",
          text: "This preview store uses test checkout only. An order can be saved even while the payment provider is not connected; it remains unpaid. A verified test payment and your exact print-proof approval are both required before an operator can release production.",
        },
        {
          title: "Can I change my wording?",
          text: "One wording revision is included before production. Open your order and send a revision request with the exact changes. An operator prepares a new proof and the previous approval is cleared. Product, size, or finish changes require a new quote.",
        },
        {
          title: "Can I personalize in Urdu?",
          text: "The studio can display Urdu text as a browser preview. Print export and production approval remain blocked for non-ASCII text until licensed font embedding, text shaping, and physical sample validation are completed.",
        },
        {
          title: "Where are my orders and drafts?",
          text: "My keepsakes lists the orders and drafts belonging to your current guest session. Guest access is private to the browser where you placed the order and expires after seven days. Named consumer accounts and cross-device claiming remain a future milestone.",
        },
        {
          title: "How do I get help or request a refund?",
          text: "Use the support form in your order. A support request does not move money. Actual provider refund events are verified and reconciled into the ledger, and refunded orders are held from further production.",
        },
      ]}
    />
  );
}
