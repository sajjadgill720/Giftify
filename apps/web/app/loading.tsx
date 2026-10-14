export default function Loading() {
  return (
    <section className="section">
      <div className="skeleton heading" />
      <div className="product-grid">
        {[0, 1, 2].map((i) => (
          <div className="skeleton tall" key={i} />
        ))}
      </div>
    </section>
  );
}
