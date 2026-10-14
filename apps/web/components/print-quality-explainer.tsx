export function PrintQualityExplainer() {
  return (
    <details className="print-quality-explainer">
      <summary>What does DPI mean for my frame?</summary>
      <p>
        It is a check of the image detail available in each inch of your print.
        We calculate it from your photo, its crop, and the size you choose.
      </p>
      <p>
        A larger print or more zoom lowers this number. For a sharper result,
        choose a smaller frame, zoom out, or upload the original high-resolution
        photograph. Changing a file's DPI label does not add missing detail.
      </p>
    </details>
  );
}
