import Link from "next/link";
import { catalog, sampleDesign } from "../../../packages/domain/src/index";
import { Artwork } from "./artwork";
import { ProductCard } from "./product-card";
import { Icon } from "./icons";
import { MemoryDemo } from "./memory-demo";
import { ShowcaseFrame } from "./showcase-frame";
import {
  memoryProfiles,
  memoryTemplates,
} from "../../../packages/domain/src/memory";
export default function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> PERSONAL GIFTS. LASTING MEANING.
          </p>
          <h1>
            Some moments
            <br />
            stay with you.
            <br />
            <em>Give them a place.</em>
          </h1>
          <p className="hero-description">
            Your favorite photo. The place you first met. The little moment that
            became everything. Turn it into something you can keep, or give.
          </p>
          <Link href="#create-memory" className="button">
            Create your memory <Icon name="arrow" />
          </Link>
          <div className="hero-note">
            <span className="little-stars">✳ ✳ ✳</span> Your words. Your moment.
            Beautifully kept.
          </div>
        </div>
        <div className="hero-room">
          <span className="room-label">THE ART OF REMEMBERING</span>
          <div className="room-frame main-frame">
            <ShowcaseFrame kind="photo" priority />
          </div>
          <div className="room-frame small-frame">
            <ShowcaseFrame kind="place" />
          </div>
          <div className="room-shelf" />
          <div className="room-vase">
            <span />
            <i />
            <b />
          </div>
          <div className="room-caption">
            <Icon name="sun" size={16} /> A little warmth for your everyday.
          </div>
          <div className="room-sticker">
            Made
            <br />
            <em>personal.</em>
          </div>
        </div>
      </section>
      <div className="promise-strip">
        {[
          ["edit", "Personalize every detail"],
          ["frame", "A4 & A3 framed art"],
          ["shield", "Approve before production"],
          ["truck", "Delivery within Pakistan"],
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
            <p className="eyebrow">WHAT WOULD YOU LOVE TO REMEMBER?</p>
            <h2>Every memory has a place here.</h2>
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
              key={id}
            >
              <span className="category-number">0{i + 1}</span>
              <Icon
                name={
                  id === "place" || id === "travel"
                    ? "sun"
                    : id === "words"
                      ? "edit"
                      : "frame"
                }
                size={29}
              />
              <h3>{memoryProfiles[id].category}</h3>
              <p>{memoryProfiles[id].hint}</p>
              <span className="text-link">
                Make it personal <Icon name="arrow" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <MemoryDemo />
      <section className="section memory-feature">
        <div className="memory-feature-art">
          <ShowcaseFrame kind="place" />
          <p className="showcase-caption">
            A little inspiration: Paris, where it all began.
          </p>
        </div>
        <div>
          <p className="eyebrow">COORDINATES & STORIES</p>
          <h2>
            A place.
            <br />
            <em>A whole world of meaning.</em>
          </h2>
          <p>
            The first hello. The home you grew up in. The place you said yes.
            Turn its coordinates into a beautifully personal keepsake.
          </p>
          <Link className="button" href="/products/coordinates">
            Remember your place <Icon name="arrow" />
          </Link>
          <p className="fine-print">
            Framed physical print · Your coordinates, names and date
          </p>
        </div>
      </section>
      <section className="section collection-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THOUGHTFULLY MADE PERSONAL</p>
            <h2>A story for every wall.</h2>
          </div>
          <Link className="text-link" href="/shop">
            Explore the collection <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="product-grid">
          {catalog.slice(0, 3).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>
      <section className="story-banner">
        <div className="story-visual">
          <ShowcaseFrame kind="arch" />
          <span className="handwritten">
            a moment,
            <br />
            made yours.
          </span>
        </div>
        <div className="story-copy">
          <p className="eyebrow">MORE THAN SOMETHING TO HANG</p>
          <h2>
            It’s a feeling.
            <br />A memory.
            <br />
            <em>A little piece of you.</em>
          </h2>
          <p>
            A first home. A hard-earned milestone. Your favorite person. Create
            a thoughtful gift that says what ordinary words can’t.
          </p>
          <Link
            href="/shop?occasion=Love%20%26%20anniversaries"
            className="text-link"
          >
            Find something meaningful <Icon name="arrow" />
          </Link>
        </div>
      </section>
      <section className="section how-section">
        <div className="center-heading">
          <p className="eyebrow">FROM YOUR STORY TO YOUR WALL</p>
          <h2>Personal, without the complicated.</h2>
        </div>
        <div className="how-grid">
          {[
            [
              "01",
              "Choose a memory",
              "A photo, a special place, a relationship, or an occasion.",
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
      <section className="occasion-section section">
        <div>
          <p className="eyebrow">SOMETHING WORTH CELEBRATING?</p>
          <h2>There’s a keepsake for that.</h2>
        </div>
        <div className="occasion-links">
          {[
            "Love & anniversaries",
            "New beginnings",
            "Achievements",
            "Family & home",
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
        <Icon name="spark" size={35} />
        <h2>For someone who means something.</h2>
        <p>Start with a moment. Make something they’ll keep.</p>
        <Link href="/shop" className="button light">
          Create a personal gift <Icon name="arrow" />
        </Link>
      </section>
    </>
  );
}
