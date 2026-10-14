# Photo layout and typography controls

Update: the subsequent [HCI refinement](editor-hci-audit.md) removes photo-only presentation choices from the editor, shows upload/search only before the first photo or during explicit changes, groups paper colors, and adds frame size/finish controls beside the preview. Previously saved artwork remains supported by the renderer. The initial milestone below records the underlying rendering capabilities.

The existing private studio now offers photo-and-wording or edge-to-edge photo-only artwork. Switching layouts retains the original uploads and wording. The first photo is used for full-frame artwork; other uploaded photographs remain saved. Full-frame photo settings do not remove map attribution.

The editor supports five print-compatible styles: classic serif, modern sans, editorial italic, bold sans, and typewriter. Headline size and supporting text size can be adjusted separately. Eight paper palettes and custom paper/text colors are validated as six-digit hex values. New designs use larger default typography. Existing saved designs keep their original values.

JPEG and PNG files can be dropped onto the private upload area or chosen with the file picker. Photos can be dragged directly in the artwork preview, including on touch devices. Arrow keys and existing crop sliders provide alternatives. A completed drag records one undo step, saves privately, and clears the crop's quality acknowledgement. Server-side DPI and ownership checks still apply to enlarged/full-frame crops.

SVG previews, font metrics, customer proofs and operator PDFs use the same structured layout and core font styles. Customers still cannot download final production artwork. Google Images search opens in a separate tab from a customer-entered query; it does not scrape or automatically import remote images and requires no Google credentials.

References reviewed: https://www.canva.com/help/resize-and-crop/ and https://www.mapiful.com/us/.

Verification includes typography/PDF rendering, full-frame geometry, invalid styling rejection, map attribution retention, and a complete quote/order/worker snapshot test, alongside existing security and purchase tests.
