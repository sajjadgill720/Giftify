"use client";
import { useState, useEffect } from "react";
import {
  catalog,
  Design,
  designSchema,
} from "../../../packages/domain/src/index";
import { svg } from "../../../packages/rendering/src/representation";
function preview(d: Design) {
  return (
    <div className="art-preview" dangerouslySetInnerHTML={{ __html: svg(d) }} />
  );
}
export default function Store() {
  const [design, setDesign] = useState<Design>({
      template: "chapter",
      title: "A new chapter",
      subtitle: "Sajjad & family",
      date: "06 October 2026",
      size: "A3",
      finish: "black",
    }),
    [q, setQ] = useState<any>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [address, setAddress] = useState({
    name: "",
    phone: "",
    line: "",
    city: "Islamabad",
    country: "PK",
    confirmed: false,
  });
  useEffect(() => {
    const saved = localStorage.getItem("keepsake-draft");
    if (saved) {
      try {
        setDesign(designSchema.parse(JSON.parse(saved)));
      } catch {}
    }
  }, []);
  function change(k: keyof Design, v: string) {
    setDesign((d) => {
      const n = { ...d, [k]: v };
      localStorage.setItem("keepsake-draft", JSON.stringify(n));
      return n;
    });
    setQ(undefined);
  }
  async function api(path: string, body: unknown) {
    const r = await fetch("/api/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) {
      if (data.orderId) sessionStorage.setItem("lastOrder", data.orderId);
      throw new Error(data.error);
    }
    return data;
  }
  async function getQuote() {
    setBusy(true);
    setError("");
    try {
      await api("session", {});
      setQ(await api("quotes", design));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const data = await api("checkouts", { quoteId: q.id, address });
      location.assign(data.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">THE MOMENTS THAT MAKE US</p>
          <h1>
            Some stories
            <br />
            deserve a place
            <br />
            <em>on your wall.</em>
          </h1>
          <p>
            A beginning. An achievement. A person who means everything.
            <br />
            Turn your milestone into something you can keep.
          </p>
          <a className="button" href="#collection">
            Create your keepsake ↗
          </a>
        </div>
        <div className="hero-art">
          {preview(design)}
          <span>YOUR WORDS. YOUR MOMENT.</span>
        </div>
      </section>
      <section id="collection">
        <p className="eyebrow">THE MILESTONE COLLECTION</p>
        <h2>A little art. A lot of meaning.</h2>
        <div className="cards">
          {catalog.map((t) => (
            <button
              key={t.id}
              className={"card " + (design.template === t.id ? "selected" : "")}
              onClick={() => change("template", t.id)}
            >
              {preview({
                ...design,
                template: t.id,
                title: t.name,
                subtitle: "Your story goes here",
              })}
              <strong>{t.name}</strong>
              <span>Personalized milestone art</span>
            </button>
          ))}
        </div>
      </section>
      <section className="editor">
        <div className={"frame " + design.finish}>{preview(design)}</div>
        <div>
          <p className="eyebrow">MAKE IT YOURS</p>
          <h2>Your words, beautifully kept.</h2>
          <p>
            Preview your draft, then review the exact print PDF before
            approving.
          </p>
          <label>
            Title
            <input
              maxLength={32}
              value={design.title}
              onChange={(e) => change("title", e.target.value)}
            />
          </label>
          <label>
            Personal message
            <input
              maxLength={48}
              value={design.subtitle}
              onChange={(e) => change("subtitle", e.target.value)}
            />
          </label>
          <label>
            Date or occasion
            <input
              maxLength={24}
              value={design.date}
              onChange={(e) => change("date", e.target.value)}
            />
          </label>
          <div className="row">
            <label>
              Print size
              <select
                value={design.size}
                onChange={(e) => change("size", e.target.value)}
              >
                <option>A3</option>
                <option>A4</option>
              </select>
            </label>
            <label>
              Frame finish
              <select
                value={design.finish}
                onChange={(e) => change("finish", e.target.value)}
              >
                <option value="black">Black</option>
                <option value="oak">Oak effect</option>
              </select>
            </label>
          </div>
          <p className="muted">
            A4 210 × 297 mm · A3 297 × 420 mm. Proposed MDF frame and acrylic
            front. Urdu print export awaits font validation.
          </p>
          <button disabled={busy} onClick={getQuote}>
            Get a price quote
          </button>
          {q && (
            <div className="quote">
              <h3>Delivery details</h3>
              <label>
                Recipient name
                <input
                  value={address.name}
                  maxLength={80}
                  onChange={(e) =>
                    setAddress({ ...address, name: e.target.value })
                  }
                />
              </label>
              <label>
                Pakistan phone number
                <input
                  type="tel"
                  value={address.phone}
                  onChange={(e) =>
                    setAddress({ ...address, phone: e.target.value })
                  }
                />
              </label>
              <label>
                Street address
                <input
                  value={address.line}
                  maxLength={160}
                  onChange={(e) =>
                    setAddress({ ...address, line: e.target.value })
                  }
                />
              </label>
              <label>
                City
                <select
                  value={address.city}
                  onChange={(e) =>
                    setAddress({ ...address, city: e.target.value })
                  }
                >
                  {["Islamabad", "Rawalpindi", "Lahore", "Karachi"].map(
                    (city) => (
                      <option key={city}>{city}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="confirmation">
                <input
                  type="checkbox"
                  checked={address.confirmed}
                  onChange={(e) =>
                    setAddress({ ...address, confirmed: e.target.checked })
                  }
                />
                I confirm the recipient details and have permission to provide
                them for this order.
              </label>
              <h3>Amount due · PKR {(q.price.total / 100).toLocaleString()}</h3>
              <p>
                Artwork {q.price.product / 100} + frame upgrade{" "}
                {q.price.frame / 100} + delivery {q.price.shipping / 100}
              </p>
              <p>
                Tax not configured · Sandbox only. Expires{" "}
                {new Date(q.expires_at).toLocaleTimeString()}.
              </p>
              <button disabled={busy || !address.confirmed} onClick={checkout}>
                Continue to sandbox checkout ↗
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="error">
              {error}{" "}
              {sessionStorage.getItem("lastOrder") && (
                <a href={"/orders/" + sessionStorage.getItem("lastOrder")}>
                  View your order and proof
                </a>
              )}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
