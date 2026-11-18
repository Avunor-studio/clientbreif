"use client";
import Link from "next/link";
import { Brand } from "@/components/brand";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="setup card stack">
      <Brand />
      <h1>We could not load this page</h1>
      <p>Try loading the page again, or return to your workspace overview.</p>
      <div className="row">
        <button className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link className="btn btn-outline" href="/app">
          Back to overview
        </Link>
      </div>
    </main>
  );
}
