import Link from "next/link";
import { Icon } from "./icons";
export function InfoPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: { title: string; text: string }[];
}) {
  return (
    <section className="section info-page">
      <div className="page-intro">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      <div className="info-layout">
        <aside>
          <Icon name="spark" size={32} />
          <h3>
            A little clarity.
            <br />A little peace of mind.
          </h3>
          <Link href="/orders" className="text-link">
            Help with an order <Icon name="arrow" size={16} />
          </Link>
        </aside>
        <div>
          {sections.map((s, i) => (
            <details className="faq-item" open={i === 0} key={s.title}>
              <summary>
                {s.title}
                <Icon name="down" size={17} />
              </summary>
              <p>{s.text}</p>
            </details>
          ))}
        </div>
      </div>
      <div className="soft-note">
        <Icon name="help" />
        <p>
          For an existing order, use the support form in My keepsakes. Requests
          are saved privately and reviewed by an operator.
        </p>
        <Link href="/orders" className="text-link">
          My keepsakes <Icon name="arrow" size={16} />
        </Link>
      </div>
    </section>
  );
}
