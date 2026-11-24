"use client";

import Link from "next/link";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu } from "lucide-react";
import { Brand } from "./brand";

const links = [
  ["The product", "/"],
  ["How it works", "/how-it-works"],
  ["For agencies", "/for-agencies"],
  ["Pricing", "/pricing"],
  ["FAQ", "/#faq"],
] as const;

export function MarketingNav() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <header className="marketing-header">
      <div className="marketing-nav site-width">
        <Link href="/" aria-label="ClientBrief home">
          <Brand />
        </Link>
        <nav className="marketing-links" aria-label="Main navigation">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="marketing-nav-actions">
          <Link className="nav-signin" href="/sign-in">
            Sign in
          </Link>
          <Link className="btn btn-primary" href="/app">
            Create workspace <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <details className="marketing-mobile-menu" ref={menu}>
          <summary aria-label="Open navigation">
            <Menu size={22} />
            <span>Menu</span>
          </summary>
          <nav
            aria-label="Mobile navigation"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a") && menu.current)
                menu.current.open = false;
            }}
          >
            {links.map(([label, href]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
            <Link href="/sign-in">Sign in</Link>
            <Link href="/app">
              Create workspace <ArrowUpRight size={16} />
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
