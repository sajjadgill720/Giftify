import Image from "next/image";
import specialPlace from "../public/images/examples/special-place-paris.png";

const examples = {
  chapter: [
    "chapter",
    "Maya & Arjun's first home",
    "Our keys. Our next chapter.",
    "12 · 09 · 2026",
  ],
  laurel: [
    "laurel",
    "You did it, Ayesha",
    "A dream, a thousand late nights",
    "CLASS OF 2026",
  ],
  horizon: [
    "travel",
    "Our summer in Italy",
    "Ayesha & Hamza · Our next adventure",
    "SUMMER · 2026",
  ],
  arch: ["photo", "Our beginning", "Ayesha & Hamza", "14 · 02 · 2026"],
  orbit: [
    "photo",
    "My whole world",
    "Ayesha, always my favorite person",
    "14 · 02 · 2026",
  ],
  bloom: [
    "family",
    "The Khan family",
    "The little moments we grew together",
    "OUR FAMILY · 2026",
  ],
  coordinates: [
    "place",
    "Paris, France",
    "Where Ayesha & Hamza first met",
    "14 · 02 · 2026",
  ],
  photo: [
    "photo",
    "Our favorite moment",
    "Ayesha & Hamza · Just us, just here",
    "14 · 02 · 2026",
  ],
  couple: ["photo", "Our kind of forever", "Ayesha & Hamza", "14 · 02 · 2026"],
  family: [
    "family",
    "The Khan family",
    "A year of laughter & love",
    "OUR LITTLE WORLD · 2026",
  ],
  birthday: [
    "birthday",
    "Sara turns thirty",
    "A little older, a lot more loved",
    "12 · 08 · 2026",
  ],
  pet: ["pet", "Cleo", "Forever by our side", "OUR FIRST HELLO · 2019"],
  travel: [
    "travel",
    "Amalfi, with you",
    "Ayesha & Hamza · The trip of a lifetime",
    "ITALY · SUMMER 2026",
  ],
  words: [
    "words",
    "Our ordinary days",
    "Ayesha & Hamza · They became everything",
    "OUR STORY, SINCE 2020",
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
              className={`showcase-photo ${kind === "family" ? "showcase-collage" : ""} ${image === "place" ? "showcase-map-window" : ""}`}
            >
              <Image
                src={
                  photoSrc ?? (kind === "family" || kind === "bloom"
                    ? "/images/examples/family-collage-v2.png"
                    : kind === "pet"
                      ? "/images/examples/pet-cat-watercolor.png"
                      : image === "photo"
                        ? "/images/examples/couple.png"
                        : image === "place"
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
