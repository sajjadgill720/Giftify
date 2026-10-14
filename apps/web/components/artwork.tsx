import type { CSSProperties } from "react";
import { Design, sampleDesign } from "../../../packages/domain/src/index";
import { svg } from "../../../packages/rendering/src/representation";
export function Artwork({
  design,
  framed = true,
  className = "",
  scene = false,
}: {
  design?: Design;
  framed?: boolean;
  className?: string;
  scene?: boolean;
}) {
  const d = design || sampleDesign();
  return (
    <div className={`${scene ? "art-scene " : ""}${className}`}>
      <div className={`${framed ? "art-frame " + d.finish : "art-paper"}`}>
        <div className="art-svg" dangerouslySetInnerHTML={{ __html: svg(d) }} />
      </div>
    </div>
  );
}
