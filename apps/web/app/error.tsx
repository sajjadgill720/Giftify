"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="section empty-state">
      <p className="eyebrow">LET’S TRY THAT AGAIN</p>
      <h1>A little pause.</h1>
      <p>
        Something interrupted this page. Your saved orders remain in your
        private session.
      </p>
      <button onClick={reset} className="button">
        Try again
      </button>
    </section>
  );
}
