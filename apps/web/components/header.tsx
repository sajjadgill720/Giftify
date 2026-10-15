"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
export function SiteHeader() {
  const path = usePathname(),
    [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  return (
    <>
      <div className="announcement">
        A little personal. A little timeless.{" "}
        <span>Preview store · Test checkout only</span>
      </div>
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="Keepsake home">
          <span className="brand-symbol">✳</span> keepsake
          <span className="brand-dot">.</span>
        </Link>
        <nav
          className={"site-nav " + (open ? "open" : "")}
          id="site-menu"
          aria-label="Main navigation"
        >
          <Link className={path === "/shop" ? "active" : ""} href="/shop">
            The collection
          </Link>
          <Link href="/shop?occasion=Nature%20studies">Nature studies</Link>
          <Link href="/help">How it works</Link>
          <Link href="/design/photo">Personalize</Link>
        </nav>
        <div className="header-actions">
          <Link
            href="/account"
            className="icon-button account-link"
            aria-label="My account"
          >
            <Icon name="person" size={20} />
          </Link>
          <Link href="/orders" className="orders-link">
            <Icon name="bag" />
            <span>My keepsakes</span>
          </Link>
          <button
            className="icon-button menu-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </header>
    </>
  );
}
