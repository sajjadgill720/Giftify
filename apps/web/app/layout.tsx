import "./style.css";
export const metadata = {
  title: "Keepsake · Personal milestone art",
  description: "Personal artwork for the moments that matter. Sandbox pilot.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <a href="/" className="brand">
            keepsake<span>ART FOR YOUR STORY</span>
          </a>
          <nav>
            <a href="/shop">The collection</a>
            <a href="/ops/orders">Order queue</a>
          </nav>
        </header>
        <div className="notice">
          SANDBOX PILOT · No live payments or shipping · Prices and materials
          await verification
        </div>
        <main>{children}</main>
        <footer>
          Made personal. Made with care.{" "}
          <span>
            Domestic Pakistan delivery planned · One proof revision included
          </span>
        </footer>
      </body>
    </html>
  );
}
