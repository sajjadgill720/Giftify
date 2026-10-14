// Generated illustration for local UI testing, not a customer photograph.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir(".local/ui-fixtures", { recursive: true });
const source = `<svg xmlns="http://www.w3.org/2000/svg" width="3600" height="3200" viewBox="0 0 900 800"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#e9c6a0"/><stop offset="1" stop-color="#f8e6bf"/></linearGradient></defs><rect width="900" height="800" fill="url(#sky)"/><circle cx="635" cy="255" r="93" fill="#e4a365"/><path d="M0 450L200 210 400 440 615 325 900 460V800H0Z" fill="#7e9a93"/><path d="M0 510L180 380 390 560 690 410 900 520V800H0Z" fill="#527b75"/><path d="M0 575Q450 455 900 580V800H0Z" fill="#bdd0c7"/><path d="M0 685Q450 530 900 690V800H0Z" fill="#dedbc5"/><path d="M0 755Q450 650 900 765" fill="none" stroke="#a6b7a4" stroke-width="9"/><text x="450" y="790" text-anchor="middle" font-family="Arial" font-size="16" fill="#667568">GENERATED ILLUSTRATION · LOCAL UI TEST</text></svg>`;
await sharp(Buffer.from(source)).jpeg({quality:92}).toFile(".local/ui-fixtures/memory-illustration.jpg");
console.log("Created .local/ui-fixtures/memory-illustration.jpg for local UI testing.");
