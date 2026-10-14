"use client";
import Link from "next/link";
import { useState } from "react";
import {
  catalog,
  Design,
  sampleDesign,
  price,
} from "../../../packages/domain/src/index";
import { Artwork } from "./artwork";
import { ProductCard } from "./product-card";
import { Icon } from "./icons";
import { money } from "../lib/client";
import { ShowcaseFrame, showcaseFor } from "./showcase-frame";
export default function Product({
  product,
}: {
  product: (typeof catalog)[number];
}) {
  const [d, setD] = useState<Design>(sampleDesign(product.id));
  const example = showcaseFor(product.id);
  const [showExample, setShowExample] = useState(true);
  function selectFinish(finish: Design["finish"]) {
    setD({ ...d, finish });
    setShowExample(false);
  }
  return (
    <>
      <section className="section product-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/shop">The collection</Link>
          <Icon name="chevron" size={12} />
          <span>{product.name}</span>
        </nav>
        <div className="product-layout">
          <div>
            <div className="product-gallery">
              {example && showExample ? (
                <ShowcaseFrame kind={example} priority />
              ) : (
                <Artwork design={d} inspirationWhenEmpty />
              )}
              <span className="gallery-note">
                {example && showExample
                  ? "FINISHED DESIGN INSPIRATION · MAKE IT YOUR OWN"
                  : "PERSONAL ART, MADE FOR YOUR SPACE"}
              </span>
            </div>
            {example && (
              <div
                className="showcase-switch"
                aria-label="Product gallery views"
              >
                <button
                  aria-pressed={showExample}
                  onClick={() => setShowExample(true)}
                >
                  Finished example
                </button>
                <button
                  aria-pressed={!showExample}
                  onClick={() => setShowExample(false)}
                >
                  Frame preview
                </button>
              </div>
            )}
            <div className="swatch-thumbs">
              {["oak", "black"].map((f) => (
                <button
                  key={f}
                  className={d.finish === f ? "selected" : ""}
                  onClick={() => selectFinish(f as Design["finish"])}
                  aria-label={"Preview " + f + " frame"}
                >
                  {example ? (
                    <ShowcaseFrame
                      kind={example}
                      finish={f as Design["finish"]}
                    />
                  ) : (
                    <Artwork design={{ ...d, finish: f as Design["finish"] }} />
                  )}
                </button>
              ))}
              <div>
                <Icon name="edit" size={19} />
                <span>
                  Your own names,
                  <br />
                  date & message.
                </span>
              </div>
            </div>
          </div>
          <div className="product-detail">
            <p className="eyebrow">{product.occasion}</p>
            <h1>{product.name}</h1>
            <div className="price-line">
              <strong>{money(price(d).product + price(d).frame)}</strong>
              <span>Personalized & framed</span>
            </div>
            <p className="product-description">{product.description}</p>
            <fieldset>
              <legend>
                Choose your size <span>Print dimensions</span>
              </legend>
              <div className="choice-row">
                {(["A4", "A3"] as const).map((s) => (
                  <button
                    aria-pressed={d.size === s}
                    className={"choice " + (d.size === s ? "selected" : "")}
                    key={s}
                    onClick={() => setD({ ...d, size: s })}
                  >
                    <strong>{s}</strong>
                    <span>{s === "A4" ? "21 × 29.7 cm" : "29.7 × 42 cm"}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>
                Frame finish{" "}
                <span>{d.finish === "oak" ? "Oak effect" : "Matte black"}</span>
              </legend>
              <div className="finish-choices">
                {(["oak", "black"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => selectFinish(f)}
                    aria-pressed={d.finish === f}
                    className={d.finish === f ? "selected" : ""}
                  >
                    <span className={"finish-swatch " + f} />
                    {f === "oak" ? "Oak effect" : "Matte black"}
                    {d.finish === f && <Icon name="check" size={14} />}
                  </button>
                ))}
              </div>
            </fieldset>
            <Link
              href={`/design/${product.id}?size=${d.size}&finish=${d.finish}`}
              className="button wide"
            >
              Make it yours <Icon name="arrow" />
            </Link>
            <div className="detail-promises">
              <span>
                <Icon name="shield" size={16} />
                Approve your exact proof
              </span>
              <span>
                <Icon name="edit" size={16} />
                One wording revision included
              </span>
            </div>
            <div className="details-list">
              <details open>
                <summary>
                  The thoughtful details <Icon name="down" size={16} />
                </summary>
                <p>
                  Original vector artwork, A4 or A3 print area, and two frame
                  finishes. Proposed materials: 250 gsm matte paper, MDF frame,
                  and acrylic front. Physical specifications and supplier
                  samples remain under validation.
                </p>
              </details>
              <details>
                <summary>
                  Delivery & timing <Icon name="down" size={16} />
                </summary>
                <p>
                  Domestic Pakistan delivery planned for Islamabad, Rawalpindi,
                  Lahore, and Karachi. Dispatch timing will be confirmed after
                  proof approval and supplier acceptance. Provisional delivery
                  allowance: {money(price(d).shipping)}.
                </p>
              </details>
              <details>
                <summary>
                  Personalization & proof <Icon name="down" size={16} />
                </summary>
                <p>
                  Your headline, message, and date appear in a live preview.
                  Review the proof preview before approving. English print
                  proofs are supported; Urdu print export is held until licensed
                  font and shaping validation is complete.
                </p>
              </details>
            </div>
            <p className="fine-print">
              Preview store with test checkout. Prices and tax treatment are
              provisional.
            </p>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A FEW MORE STORIES</p>
            <h2>You might find your moment here.</h2>
          </div>
        </div>
        <div className="product-grid">
          {catalog
            .filter((p) => p.id !== product.id)
            .slice(0, 3)
            .map((p, i) => (
              <ProductCard product={p} key={p.id} index={i + 2} />
            ))}
        </div>
      </section>
    </>
  );
}
