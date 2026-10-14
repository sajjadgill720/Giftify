"use client";
import { useState } from "react";
import { catalog } from "../../../packages/domain/src/index";
import { ProductCard } from "./product-card";
import { Icon } from "./icons";
export default function Collection({
  initialOccasion = "All designs",
}: {
  initialOccasion?: string;
}) {
  const [filter, setFilter] = useState(initialOccasion),
    [sort, setSort] = useState("featured"),
    [search, setSearch] = useState("");
  const occasions = ["All designs", ...new Set(catalog.map((p) => p.occasion))];
  const products = catalog
    .filter(
      (p) =>
        (filter === "All designs" || p.occasion === filter) &&
        [p.name, p.description, p.occasion]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : 0));
  return (
    <section className="section shop-page">
      <div className="page-intro">
        <p className="eyebrow">THE KEEPSAKE COLLECTION</p>
        <h1>
          Small moments.
          <br />
          <em>Meaningful things.</em>
        </h1>
        <p>
          Original artwork for the chapters, people, and milestones that make
          your story yours.
        </p>
      </div>
      <div className="collection-toolbar">
        <div className="filter-pills" aria-label="Filter by occasion">
          {occasions.map((o) => (
            <button
              key={o}
              onClick={() => setFilter(o)}
              aria-pressed={filter === o}
              className={"pill " + (filter === o ? "selected" : "")}
            >
              {o}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Icon name="search" size={17} />
          <input
            aria-label="Search designs"
            placeholder="Find a design"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="result-bar">
        <span>
          {products.length} original designs{" "}
          <span className="muted">· Made personal for you</span>
        </span>
        <label>
          Sort by{" "}
          <select
            aria-label="Sort designs"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="featured">Featured</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} index={catalog.indexOf(p)} />
        ))}
      </div>
      {!products.length && (
        <div className="empty-state">
          <Icon name="search" size={32} />
          <h2>A little more room to explore.</h2>
          <p>No designs match your search. Try another word or occasion.</p>
          <button
            className="button"
            onClick={() => {
              setFilter("All designs");
              setSearch("");
            }}
          >
            Show all designs
          </button>
        </div>
      )}
      <p className="fine-print">
        Pilot prices are provisional. Final tax and product specifications must
        be verified before live ordering.
      </p>
    </section>
  );
}
