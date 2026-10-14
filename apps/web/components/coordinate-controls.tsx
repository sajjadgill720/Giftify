"use client";
import { useEffect, useState } from "react";
import { Design } from "../../../packages/domain/src/index";
export function CoordinateControls({
  design,
  change,
  validity,
}: {
  design: Design;
  change: (next: Design) => void;
  validity: (valid: boolean) => void;
}) {
  const [lat, setLat] = useState(String(design.location!.latitude));
  const [lon, setLon] = useState(String(design.location!.longitude));
  const validLat =
    lat.trim() !== "" &&
    Number.isFinite(Number(lat)) &&
    Math.abs(Number(lat)) <= 90;
  const validLon =
    lon.trim() !== "" &&
    Number.isFinite(Number(lon)) &&
    Math.abs(Number(lon)) <= 180;
  useEffect(() => {
    setLat(String(design.location!.latitude));
    setLon(String(design.location!.longitude));
    validity(true);
  }, [design.location?.latitude, design.location?.longitude, validity]);
  function edit(axis: "latitude" | "longitude", value: string) {
    const a = axis === "latitude" ? value : lat,
      b = axis === "longitude" ? value : lon;
    axis === "latitude" ? setLat(value) : setLon(value);
    const valid =
      a.trim() !== "" &&
      b.trim() !== "" &&
      Number.isFinite(Number(a)) &&
      Number.isFinite(Number(b)) &&
      Math.abs(Number(a)) <= 90 &&
      Math.abs(Number(b)) <= 180;
    validity(valid);
    if (valid)
      change({
        ...design,
        location: { latitude: Number(a), longitude: Number(b) },
      });
  }
  return (
    <fieldset className="coordinate-controls">
      <legend>A place you’ll never forget</legend>
      <p className="field-hint">
        Enter the coordinates of your meaningful place. North and east are
        positive; south and west are negative. Check the location before
        ordering.
      </p>
      <div className="coordinate-pair">
        <label className="field">
          Latitude
          <input
            inputMode="decimal"
            value={lat}
            aria-invalid={!validLat}
            onChange={(e) => edit("latitude", e.target.value)}
            aria-describedby="coordinate-range"
          />
        </label>
        <label className="field">
          Longitude
          <input
            inputMode="decimal"
            value={lon}
            aria-invalid={!validLon}
            onChange={(e) => edit("longitude", e.target.value)}
            aria-describedby="coordinate-range"
          />
        </label>
      </div>
      {(!validLat || !validLon) && (
        <p className="error-message" role="alert">
          Enter both coordinates within the ranges below before continuing.
        </p>
      )}
      <p id="coordinate-range" className="field-hint">
        Latitude −90 to 90 · Longitude −180 to 180
      </p>
      <label className="field">
        Coordinate format
        <select
          value={design.coordinateFormat}
          onChange={(e) =>
            change({
              ...design,
              coordinateFormat: e.target.value as Design["coordinateFormat"],
            })
          }
        >
          <option value="decimal">Decimal degrees</option>
          <option value="dms">Degrees, minutes & seconds</option>
        </select>
      </label>
      <label className="field">
        Colour palette
        <select
          value={design.theme}
          onChange={(e) =>
            change({ ...design, theme: e.target.value as Design["theme"] })
          }
        >
          <option value="ivory">Warm ivory</option>
          <option value="midnight">Midnight blue</option>
          <option value="rose">Soft rose</option>
        </select>
      </label>
      <label className="field">
        Typography
        <select
          value={design.typography}
          onChange={(e) =>
            change({
              ...design,
              typography: e.target.value as Design["typography"],
            })
          }
        >
          <option value="classic">Editorial serif</option>
          <option value="modern">Modern sans serif</option>
        </select>
      </label>
    </fieldset>
  );
}
