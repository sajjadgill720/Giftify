import Link from "next/link";
import {
  catalog,
  sampleDesign,
  price,
} from "../../../packages/domain/src/index";
import { Artwork } from "./artwork";
import { ShowcaseFrame, showcaseFor } from "./showcase-frame";
import { Icon } from "./icons";
import { money } from "../lib/client";
export function ProductCard({
  product,
  index = 0,
}: {
  product: (typeof catalog)[number];
  index?: number;
}) {
  const example = showcaseFor(product.id);
  return (
    <Link href={"/products/" + product.id} className="product-card">
      <div className={"product-scene scene-" + (index % 6)}>
        {example ? (
          <ShowcaseFrame kind={example} />
        ) : (
          <Artwork design={sampleDesign(product.id)} />
        )}
        <span className="product-tag">Illustrative example</span>
        <span className="product-open">
          <Icon name="arrow" />
        </span>
      </div>
      <div className="product-info">
        <div>
          <span className="caption">{product.occasion}</span>
          <h3>{product.name}</h3>
        </div>
        <span className="product-price">
          From{" "}
          {money(
            price({ ...sampleDesign(product.id), size: "A4", finish: "black" })
              .product,
          )}
        </span>
      </div>
    </Link>
  );
}
