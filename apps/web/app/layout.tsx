import "./theme.css";
import Link from "next/link";
import { SiteHeader } from "../components/header";
import { Icon } from "../components/icons";
export const metadata = {
  title: "Keepsake · Personal milestone art",
  description: "Personal artwork for the moments that matter. Sandbox pilot.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <footer className="site-footer">
          <div className="footer-top">
            <div>
              <Link href="/" className="wordmark">
                ✳ keepsake.
              </Link>
              <p>
                Personal artwork for the people
                <br />
                and moments that matter.
              </p>
            </div>
            <div>
              <h4>Find your moment</h4>
              <Link href="/shop">The collection</Link>
              <Link href="/shop?occasion=Love%20%26%20anniversaries">
                Love & anniversaries
              </Link>
              <Link href="/shop?occasion=New%20beginnings">New beginnings</Link>
            </div>
            <div>
              <h4>Here to help</h4>
              <Link href="/help">How it works</Link>
              <Link href="/delivery">Delivery & proof approval</Link>
              <Link href="/orders">My orders & support</Link>
            </div>
            <div className="footer-motto">
              <Icon name="spark" size={28} />
              <p>
                Good things deserve
                <br />
                <em>to be remembered.</em>
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Keepsake · Working brand</span>
            <div>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Pilot terms</Link>
              <Link href="/ops/orders">Operations</Link>
            </div>
            <span>Made personal, in Pakistan.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
