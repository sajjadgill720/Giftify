import Link from "next/link";
import { Icon } from "../components/icons";
export default function NotFound() {
  return (
    <section className="section empty-state">
      <Icon name="spark" size={45} />
      <p className="eyebrow">A SMALL DETOUR</p>
      <h1>This story isn’t here.</h1>
      <p>
        The page may have moved. There are still plenty of meaningful moments to
        explore.
      </p>
      <Link href="/shop" className="button">
        Find your keepsake <Icon name="arrow" />
      </Link>
    </section>
  );
}
