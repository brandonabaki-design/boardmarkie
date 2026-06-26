// QR-code helpers for embedding EduSim links into slides. Kept dependency-light
// (only the `qrcode` lib) so it can be imported from any client component.
//
// We default to producing an SVG string: it carries a viewBox (no fixed pixel
// size), so it scales crisply at any zoom AND — with SVG's default
// preserveAspectRatio — stays square inside a non-square canvas box rather than
// stretching into an unscannable rectangle. SVG also survives cross-device sync,
// since the storage layer only strips heavy base64 *raster* (`data:`) images.

import QRCode, {
  type QRCodeToStringOptions,
  type QRCodeToDataURLOptions,
} from "qrcode";

// ECC level "M" (15% recovery) reads well on phone cameras; a small quiet-zone
// margin keeps the code scannable without wasting slide space.
const ECC = "M" as const;

/** Render a QR for `text` as an inline SVG string (for ImageElement.svg). */
export async function qrToSvg(text: string, opts: QRCodeToStringOptions = {}): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: ECC,
    margin: 2,
    ...opts,
  });
}

/** Render a QR for `text` as a PNG data URL (for previews / downloads). */
export async function qrToDataURL(text: string, opts: QRCodeToDataURLOptions = {}): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: ECC,
    margin: 2,
    width: 1024,
    ...opts,
  });
}
