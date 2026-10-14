try {
  process.loadEnvFile(".env");
} catch {}
const required = [
  "SAFEPAY_SECRET_KEY",
  "SAFEPAY_PUBLIC_KEY",
  "SAFEPAY_WEBHOOK_SECRET",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
];
console.log(
  "Integration configuration (presence only; not provider acceptance):",
);
for (const name of required)
  console.log(`${name}: ${process.env[name] ? "configured" : "missing"}`);
console.log(
  `DATABASE_URL: ${process.env.DATABASE_URL ? "external PostgreSQL" : "local embedded PostgreSQL"}`,
);
console.log(
  `Private proof mirror: ${process.env.SUPABASE_STORAGE_BUCKET ? "configured; must validate private bucket and server key" : "not configured"}`,
);
console.log(
  "Live payment mode: disabled by adapter. Launch still requires credentialed sandbox acceptance, verified email confirmation / MFA roles, tax approval, print samples, supplier/courier terms, and backup restore validation.",
);
