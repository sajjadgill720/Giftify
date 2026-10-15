import Link from "next/link";
import Image from "next/image";
import atelierInterior from "../public/images/examples/atelier-interior.png";
import galleryAlcove from "../public/images/examples/gallery-alcove.png";
import walnutInterior from "../public/images/examples/walnut-interior.png";
import sageInterior from "../public/images/examples/sage-interior.png";
import { catalog } from "../../../packages/domain/src/index";
import { ProductCard } from "./product-card";
import { Icon } from "./icons";
import { ShowcaseFrame } from "./showcase-frame";
import {
  memoryProfiles,
  memoryTemplates,
} from "../../../packages/domain/src/memory";
export default function Home() {
  return (
    <div className="atelier-home">
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">A considered view. Beautifully framed.</p>
          <h1>
            A place in
            <br />
            your heart.
            <br />
            <em>A piece for your home.</em>
          </h1>
          <p className="hero-description">
            The quiet strength of a tree. The scale of an open landscape.
            Architecture and objects with a story to tell. Bring what moves you
            into the space you call home.
          </p>
          <Link href="/design/photo" className="button">
            Compose your artwork <Icon name="arrow" />
          </Link>
          <div className="hero-note">
            Your perspective. Your words. A piece entirely your own.
          </div>
        </div>
        <div className="boutique-hero-art">
          <Image
            className="atelier-backdrop"
            src={atelierInterior}
            alt=""
            fill
            sizes="(max-width: 600px) 100vw, 50vw"
            preload
          />
          <span className="boutique-art-index">01 / A moment, kept</span>
          <div className="boutique-hero-frame">
            <ShowcaseFrame kind="couple" priority />
          </div>
          <p className="artwork-disclaimer">
            Illustrative interior · Example personalization
          </p>
        </div>
      </section>
      <div className="promise-strip">
        {[
          ["edit", "Your photos & personal words"],
          ["frame", "A4 & A3 print sizes"],
          ["shield", "Approve your proof before production"],
        ].map(([icon, text]) => (
          <span key={text}>
            <Icon name={icon} size={18} />
            {text}
          </span>
        ))}
      </div>
      <section className="section memory-category-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Find your story</p>
            <h2>A collection with a point of view.</h2>
            <p className="category-introduction">
              Nature, architecture, and the art of everyday things. Find a view
              you’d like to keep.
            </p>
          </div>
          <Link href="/shop" className="text-link">
            Explore all designs <Icon name="arrow" size={16} />
          </Link>
        </div>
        <div className="memory-category-grid">
          {memoryTemplates.map((id, i) => (
            <Link
              className={"memory-category-card category-" + id}
              href={"/products/" + id}
              aria-label={"Explore " + memoryProfiles[id].category}
              key={id}
            >
              <span className="category-number" aria-hidden="true">
                0{i + 1}
              </span>
              <div className="category-artwork" aria-hidden="true">
                <ShowcaseFrame kind={id} finish={i % 2 ? "black" : "oak"} />
              </div>
              <div className="category-copy">
                <h3>{memoryProfiles[id].category}</h3>
                <p>{memoryProfiles[id].hint}</p>
              </div>
              <span className="text-link">
                Explore <Icon name="arrow" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="section sacred-collection">
        <div>
          <p className="eyebrow">Quranic ayat & ahadees</p>
          <h2>A place for reflection.</h2>
          <p>
            Meaningful words, composed with restraint. Create a text-only piece
            around your chosen ayah or hadith, with its source carefully
            recorded.
          </p>
          <Link
            href="/shop?occasion=Quran%20%26%20Hadith"
            className="text-link"
          >
            Explore the collection <Icon name="arrow" />
          </Link>
        </div>
        <div className="sacred-frame-pair">
          <Link href="/products/quran" aria-label="Explore Quranic ayat">
            <ShowcaseFrame kind="quran" />
            <span>
              Quranic ayat <Icon name="arrow" size={16} />
            </span>
          </Link>
          <Link href="/products/hadith" aria-label="Explore Ahadees">
            <ShowcaseFrame kind="hadith" finish="black" />
            <span>
              Ahadees <Icon name="arrow" size={16} />
            </span>
          </Link>
        </div>
      </section>
      <section className="section collection-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A considered selection</p>
            <h2>Quiet beauty. Lasting presence.</h2>
          </div>
          <Link className="text-link" href="/shop">
            Explore the collection <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="product-grid">
          {["place", "photo", "family"]
            .map((id) => catalog.find((p) => p.id === id)!)
            .map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                index={i}
                sceneImage={[atelierInterior, walnutInterior, sageInterior][i]}
              />
            ))}
        </div>
        <p className="collection-imagery-note">
          Illustrative artwork examples. Your own photographs, location and
          wording make the finished piece personal.
        </p>
      </section>
      <section className="story-banner">
        <div className="story-visual">
          <Image
            className="editorial-room-backdrop"
            src={atelierInterior}
            alt=""
            fill
            sizes="(max-width: 700px) 100vw, 50vw"
          />
          <div className="story-frame-pair">
            <div className="story-family-frame">
              <ShowcaseFrame kind="family" finish="black" />
            </div>
            <div className="story-pet-frame">
              <ShowcaseFrame kind="pet" />
            </div>
          </div>
          <p className="story-scene-caption">
            Different stories. Equally personal.
            <span>Illustrative artwork examples</span>
          </p>
        </div>
        <div className="story-copy">
          <p className="eyebrow">Thoughtful by nature</p>
          <h2>
            Some gifts
            <br />
            <em>say a little more.</em>
          </h2>
          <p>
            A favorite landscape. A beautiful building. A quiet corner of
            nature. Create a thoughtful piece that brings a little calm into a
            home.
          </p>
          <Link href="/shop" className="text-link">
            Find something meaningful <Icon name="arrow" />
          </Link>
        </div>
      </section>
      <section className="section how-section">
        <div className="center-heading">
          <p className="eyebrow">The personal touches</p>
          <h2>From your story to your wall.</h2>
        </div>
        <div
          className="process-composition"
          aria-label="Illustrative transformation from a photograph to a personalized frame"
        >
          <figure className="process-photograph">
            <Image
              src="/images/examples/fine-art-building.png"
              alt="Illustrative architectural photograph of a limestone archway"
              width={1024}
              height={1536}
              sizes="(max-width: 600px) 35vw, 210px"
            />
            <figcaption>Your moment</figcaption>
          </figure>
          <span className="process-arrow" aria-hidden="true">
            <Icon name="arrow" size={32} />
          </span>
          <figure className="process-artwork">
            <ShowcaseFrame
              kind="photo"
              photoSrc="/images/examples/fine-art-building.png"
              wording={{
                title: "Stories in stone",
                message: "Light upon limestone",
                date: "18 · 04 · 2026",
              }}
            />
            <figcaption>Your keepsake</figcaption>
          </figure>
        </div>
        <div className="how-grid">
          {[
            [
              "01",
              "Choose a memory",
              "A landscape, a tree, a building, or an object with character.",
              "spark",
            ],
            [
              "02",
              "Make it personal",
              "Add photos, names, dates, and the words that matter.",
              "edit",
            ],
            [
              "03",
              "Preview your artwork",
              "Try a different frame, palette, and setting. Find what feels right.",
              "check",
            ],
            [
              "04",
              "Place your order",
              "Save your design, complete test checkout, and approve its proof before fulfillment.",
              "bag",
            ],
          ].map(([n, title, text, icon]) => (
            <article key={n}>
              <span className="step-number">{n}</span>
              <div className="step-icon">
                <Icon name={icon} size={27} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section finish-guide">
        <div className="finish-guide-heading">
          <p className="eyebrow">The finishing touches</p>
          <h2>
            Your story. <em>Beautifully set.</em>
          </h2>
          <p>Two finishes. Two sizes. A little space for something personal.</p>
        </div>
        <div
          className="finish-study"
          aria-label="Illustrative comparison of supported frame finishes"
        >
          <Image
            className="editorial-room-backdrop"
            src={galleryAlcove}
            alt=""
            fill
            sizes="(max-width: 800px) 90vw, 45vw"
          />
          <figure>
            <ShowcaseFrame kind="family" finish="oak" />
            <figcaption>
              <span className="finish-dot oak" />
              Oak effect
            </figcaption>
          </figure>
          <figure>
            <ShowcaseFrame kind="pet" finish="black" />
            <figcaption>
              <span className="finish-dot black" />
              Matte black
            </figcaption>
          </figure>
          <p className="artwork-disclaimer">
            Digital finish studies · Illustrative, not product photography
          </p>
        </div>
        <div className="finish-guide-copy">
          <div className="finish-detail-heading">
            <span aria-hidden="true">01</span>
            <div>
              <h3>Find your finish</h3>
              <p>
                Warm oak effect or understated matte black. Compare both in your
                live preview.
              </p>
            </div>
          </div>
          <div className="finish-detail-heading">
            <span aria-hidden="true">02</span>
            <div>
              <h3>Give it the right space</h3>
              <p>Choose the print dimensions that suit your setting.</p>
            </div>
          </div>
          <dl className="size-guide">
            <div>
              <dt>A4</dt>
              <dd>
                21 × 29.7 cm<span>A personal corner</span>
              </dd>
            </div>
            <div>
              <dt>A3</dt>
              <dd>
                29.7 × 42 cm<span>A little more presence</span>
              </dd>
            </div>
          </dl>
          <p className="fine-print">
            Dimensions describe the print area. Final frame materials and outer
            dimensions are still being validated.
          </p>
          <Link href="/products/photo" className="text-link">
            Explore sizes & finishes <Icon name="arrow" size={16} />
          </Link>
        </div>
      </section>
      <section className="occasion-section section">
        <div>
          <p className="eyebrow">Discover your perspective</p>
          <h2>Find beauty in the details.</h2>
        </div>
        <div className="occasion-links">
          {[
            "Nature studies",
            "Landscapes & light",
            "Architecture & places",
            "Still life & objects",
          ].map((o, i) => (
            <Link href={"/shop?occasion=" + encodeURIComponent(o)} key={o}>
              <span>0{i + 1}</span>
              {o}
              <Icon name="arrow" />
            </Link>
          ))}
        </div>
      </section>
      <section className="closing-note">
        <div className="closing-artwork" aria-hidden="true">
          <ShowcaseFrame kind="words" />
        </div>
        <div className="closing-copy">
          <p className="eyebrow">A little more personal</p>
          <h2>A quiet statement. Entirely yours.</h2>
          <p>
            Choose a view. Refine the details. Create a piece with lasting
            presence.
          </p>
          <Link href="/shop" className="button light">
            Create a personal gift <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </div>
  );
}
