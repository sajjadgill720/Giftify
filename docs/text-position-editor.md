# Text positioning and preview controls

Frame size and finish controls now precede the artwork in the studio DOM and visual layout.

Memory artwork supports dragging headline, names, message, location, and date vertically. Arrow keys move by 0.5% of the paper height; Shift + arrow moves by 2%. Pointer movement previews locally and commits one edit on release, so undo restores the prior position. Pointer cancellation discards the temporary movement. Read-only artwork and customer proof previews do not show editing handles.

Layout controls include a 50–120% text-spacing slider, individual vertical-position sliders, and a position/spacing reset. Changing shared spacing clears individual overrides. Existing fonts, text sizing, paper/text colors, photo cropping, zoom, rotation, and filters remain available.

Optional bounded text positions and spacing are validated in the design schema and stored in the existing design snapshot. Shared layout geometry drives browser SVG and print PDF output. Photo designs constrain custom text positions below the image area; map attribution is not editable. Existing designs without these options retain their previous positions. No export permissions changed.

Verified: native browser drag, keyboard movement, undo, controls above preview, mobile layout without horizontal overflow, and spacing save/reload. Automated suite: 49 tests passed. TypeScript and production build passed.
