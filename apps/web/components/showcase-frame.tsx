import Image from "next/image";
import specialPlace from "../public/images/examples/special-place-paris.png";

const examples = {
  chapter: [
    "fine-art-building",
    "A doorway to somewhere",
    "Stone, light & quiet streets",
    "12 · 09 · 2026",
  ],
  laurel: [
    "fine-art-tree",
    "Rooted in stillness",
    "An olive tree study",
    "TUSCANY · 2026",
  ],
  horizon: [
    "fine-art-landscape",
    "Beyond the horizon",
    "A place to breathe",
    "SUMMER · 2026",
  ],
  arch: ["fine-art-building", "Quiet architecture", "Light upon limestone", "ITALY · 2026"],
  orbit: [
    "fine-art-stilllife",
    "The art of simple things",
    "Ceramic, linen & brass",
    "14 · 02 · 2026",
  ],
  bloom: [
    "fine-art-tree",
    "Under the olive tree",
    "A little closer to nature",
    "TUSCANY · 2026",
  ],
  coordinates: [
    "place",
    "Paris, France",
    "Streets worth remembering",
    "14 · 02 · 2026",
  ],
  photo: [
    "fine-art-landscape",
    "A moment of stillness",
    "Mountains, water & morning light",
    "14 · 02 · 2026",
  ],
  couple: ["fine-art-tree", "Rooted in stillness", "The olive groves of Tuscany", "SPRING · 2026"],
  family: [
    "fine-art-building",
    "Stories in stone",
    "The beauty of quiet places",
    "ITALY · 2026",
  ],
  birthday: [
    "fine-art-stilllife",
    "Everyday sculpture",
    "Collected with care",
    "12 · 08 · 2026",
  ],
  pet: ["fine-art-stilllife", "Simple, beautiful things", "A study in warm neutrals", "STILL LIFE · 2026"],
  travel: [
    "fine-art-landscape",
    "Where the mountains meet",
    "A quiet alpine morning",
    "THE ALPS · 2026",
  ],
  words: [
    "words",
    "The quiet things",
    "A little space for stillness",
    "NOTES FROM NATURE",
  ],
  place: ["place", "Paris, France", "Where it all began", "14 · 02 · 2026"],
} as const;
export type ShowcaseKind = keyof typeof examples;

export function showcaseFor(productId: string) {
  return Object.hasOwn(examples, productId)
    ? (productId as ShowcaseKind)
    : undefined;
}

/** Finished storefront examples only; never used for customer artwork or proofs. */
export function ShowcaseFrame({
  kind,
  priority = false,
  finish = "oak",
  photoSrc,
  wording,
}: {
  kind: ShowcaseKind;
  priority?: boolean;
  finish?: "oak" | "black";
  photoSrc?: string;
  wording?: { title: string; message: string; date: string };
}) {
  const [image, defaultTitle, defaultMessage, defaultDate] = examples[kind];
  const { title, message, date } = wording ?? {
    title: defaultTitle,
    message: defaultMessage,
    date: defaultDate,
  };
  return (
    <div
      className={`showcase-frame showcase-${kind === "photo" ? "photo-frame" : kind}`}
    >
      <div
        className={`art-frame ${finish} showcase-composition`}
        role="img"
        aria-label={`Example framed artwork: ${title}. ${message}`}
      >
        <div className="showcase-paper">
          {image === "words" ? (
            <div className="showcase-quote">
              <span>“</span>
              <p>
                The long walks.
                <br />
                The quiet mornings.
                <br />
                The ordinary days
                <br />
                <em>that became everything.</em>
              </p>
              <span>✳</span>
            </div>
          ) : (
            <div
              className={`showcase-photo ${image === "place" ? "showcase-map-window" : ""}`}
            >
              <Image
                src={
                  photoSrc ?? (image === "place"
                    ? specialPlace
                    : `/images/examples/${image}.png`)
                }
                alt=""
                width={1024}
                height={1536}
                sizes="(max-width: 700px) 70vw, 340px"
                preload={priority}
              />
            </div>
          )}
          <div className="showcase-wording">
            <strong>{title}</strong>
            <p>{message}</p>
            <small>{date}</small>
          </div>
        </div>
      </div>
    </div>
  );
}
