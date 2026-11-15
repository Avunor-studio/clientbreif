"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="main stack">
      <h1>We could not load this page</h1>
      <p>Check your connection and service setup, then try again.</p>
      <button className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
