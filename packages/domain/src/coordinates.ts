export function formatCoordinate(
  value: number,
  axis: "latitude" | "longitude",
  format: "decimal" | "dms" = "decimal",
) {
  const max = axis === "latitude" ? 90 : 180;
  if (!Number.isFinite(value) || Math.abs(value) > max)
    throw new Error("Invalid coordinate.");
  const hemisphere =
    axis === "latitude" ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E";
  if (format === "decimal")
    return `${Math.abs(value).toFixed(5)}°${hemisphere}`;
  const seconds = Math.round(Math.abs(value) * 3600);
  return `${Math.floor(seconds / 3600)}°${Math.floor((seconds % 3600) / 60)}'${seconds % 60}"${hemisphere}`;
}
