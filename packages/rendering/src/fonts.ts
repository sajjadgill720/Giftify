// The same core font families/styles are used by the SVG preview, metrics and PDF.
export function printFont(font: string, border = false) {
  if (border) return "Helvetica";
  return (
    (
      {
        serif: "Times-Roman",
        editorial: "Times-Italic",
        bold: "Helvetica-Bold",
        mono: "Courier",
      } as Record<string, string>
    )[font] || "Helvetica"
  );
}
export function svgFont(font: string, border = false) {
  const name = printFont(font, border);
  const family = name.startsWith("Times")
    ? "Times New Roman,serif"
    : name === "Courier"
      ? "Courier New,monospace"
      : "Helvetica,Arial,sans-serif";
  return `font-family="${family}" font-style="${name === "Times-Italic" ? "italic" : "normal"}" font-weight="${name === "Helvetica-Bold" ? "700" : "400"}"`;
}
