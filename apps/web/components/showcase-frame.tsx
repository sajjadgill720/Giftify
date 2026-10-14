import Image from "next/image";
import favoriteMoment from "../public/images/examples/favorite-moment.png";
import specialPlace from "../public/images/examples/special-place-paris.png";

const examples = {
  chapter: [
    "chapter",
    "Our first home",
    "A new chapter, together",
    "12 · 09 · 2026",
  ],
  laurel: [
    "laurel",
    "You did it, Ayesha",
    "Every little effort led you here",
    "CLASS OF 2026",
  ],
  horizon: [
    "travel",
    "Beyond the horizon",
    "Our next adventure awaits",
    "SUMMER · 2026",
  ],
  arch: ["photo", "Our beginning", "Ayesha & Hamza", "14 · 02 · 2026"],
  orbit: [
    "photo",
    "My whole world",
    "Always finding my way to you",
    "14 · 02 · 2026",
  ],
  bloom: [
    "family",
    "Together, we grow",
    "The people who make a home",
    "OUR FAMILY · 2026",
  ],
  coordinates: [
    "place",
    "Paris, France",
    "Where it all began",
    "14 · 02 · 2026",
  ],
  photo: [
    "photo",
    "Our Favorite Moment",
    "Where it all began",
    "14 · 02 · 2026",
  ],
  couple: ["photo", "Our kind of forever", "Ayesha & Hamza", "14 · 02 · 2026"],
  family: [
    "family",
    "Our little world",
    "The best things happen together",
    "THE KHAN FAMILY",
  ],
  birthday: [
    "birthday",
    "Thirty & blooming",
    "Here's to your next chapter",
    "HAPPY BIRTHDAY, SARA",
  ],
  pet: ["pet", "Always by my side", "Life is better with Milo", "OUR GOOD BOY"],
  travel: [
    "travel",
    "Somewhere with you",
    "Postcards from the Amalfi coast",
    "ITALY · SUMMER 2026",
  ],
  words: [
    "words",
    "The little moments",
    "They became our whole story",
    "FOREVER, IN OUR WORDS",
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
}: {
  kind: ShowcaseKind;
  priority?: boolean;
  finish?: "oak" | "black";
}) {
  const [image, title, message, date] = examples[kind];
  const supplied = (kind === "photo" || image === "place") && finish === "oak";
  return (
    <div className={`showcase-frame showcase-${kind}`}>
      {supplied ? (
        <Image
          src={image === "photo" ? favoriteMoment : specialPlace}
          alt={
            kind === "photo"
              ? "Example oak framed sunset photo: Our Favorite Moment"
              : "Example oak framed Paris map: Where it all began"
          }
          sizes="(max-width: 700px) 70vw, 340px"
          preload={priority}
        />
      ) : (
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
                className={`showcase-photo ${kind === "family" ? "showcase-collage" : ""}`}
              >
                <Image
                  src={
                    image === "photo"
                      ? "/images/examples/couple.png"
                      : image === "place"
                        ? specialPlace
                        : `/images/examples/${image}.png`
                  }
                  alt=""
                  width={1024}
                  height={1536}
                  sizes="(max-width: 700px) 70vw, 340px"
                  preload={priority}
                />
                {kind === "family" && (
                  <>
                    <span />
                    <span />
                  </>
                )}
              </div>
            )}
            <div className="showcase-wording">
              <strong>{title}</strong>
              <p>{message}</p>
              <small>{date}</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
