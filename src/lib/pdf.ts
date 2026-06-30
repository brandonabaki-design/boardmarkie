// Minimal, dependency-free PDF writer for simple text documents (e.g. a
// NotebookLM source file). Uses the two standard base fonts (Helvetica +
// Helvetica-Bold, no embedding) and WinAnsi text, so output is tiny and opens
// everywhere. Handles word-wrap and pagination; not a general-purpose PDF lib.

export interface PdfLine {
  text: string;
  size?: number; // pt, default 11
  bold?: boolean;
  gap?: number; // extra vertical space (pt) before this line
}

const PAGE_W = 612; // US Letter
const PAGE_H = 792;
const MARGIN = 56;
const USABLE_W = PAGE_W - MARGIN * 2;

// Approximate Helvetica advance width as a fraction of font size (good enough
// to wrap conservatively without an embedded metrics table).
const CHAR_W = 0.5;
const CHAR_W_BOLD = 0.54;

// Replace characters outside printable ASCII with safe equivalents so the
// standard WinAnsi fonts render them (smart quotes, dashes, bullets, …).
function toAscii(s: string): string {
  return s
    .replace(/[‘’‚‹›]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•·▪●‣⁃]/g, "-")
    .replace(/ /g, " ")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdf(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, size: number, bold: boolean): string[] {
  const maxChars = Math.max(8, Math.floor(USABLE_W / (size * (bold ? CHAR_W_BOLD : CHAR_W))));
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
    while (cur.length > maxChars) {
      lines.push(cur.slice(0, maxChars));
      cur = cur.slice(maxChars);
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function textPdf(lines: PdfLine[]): Blob {
  // 1) Lay out into pages of absolutely-positioned physical lines.
  type Phys = { text: string; size: number; bold: boolean; y: number };
  const pages: Phys[][] = [];
  let page: Phys[] = [];
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    pages.push(page);
    page = [];
    y = PAGE_H - MARGIN;
  };

  for (const ln of lines) {
    const size = ln.size ?? 11;
    const bold = !!ln.bold;
    const lh = size * 1.35;
    if (ln.gap) y -= ln.gap;
    for (const t of wrap(toAscii(ln.text), size, bold)) {
      if (y - lh < MARGIN && page.length) newPage();
      y -= lh;
      page.push({ text: escapePdf(t), size, bold, y });
    }
  }
  pages.push(page);

  // 2) Build the PDF objects. Reserved: 1 Catalog, 2 Pages, 3 F1, 4 F2.
  const objects: string[] = [];
  const ref = (n: number) => `${n} 0 R`;
  const pageNums: number[] = [];
  const contentNums: number[] = [];
  let next = 5;
  for (let i = 0; i < pages.length; i++) {
    pageNums.push(next++);
    contentNums.push(next++);
  }

  objects[1] = `<< /Type /Catalog /Pages ${ref(2)} >>`;
  objects[2] =
    `<< /Type /Pages /Kids [${pageNums.map(ref).join(" ")}] /Count ${pages.length} ` +
    `/MediaBox [0 0 ${PAGE_W} ${PAGE_H}] >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objects[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

  pages.forEach((pg, i) => {
    const parts: string[] = ["BT"];
    let curFont = "";
    let curSize = -1;
    for (const l of pg) {
      const font = l.bold ? "/F2" : "/F1";
      if (font !== curFont || l.size !== curSize) {
        parts.push(`${font} ${l.size} Tf`);
        curFont = font;
        curSize = l.size;
      }
      parts.push(`1 0 0 1 ${MARGIN} ${l.y.toFixed(2)} Tm (${l.text}) Tj`);
    }
    parts.push("ET");
    const stream = parts.join("\n");
    objects[contentNums[i]] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageNums[i]] =
      `<< /Type /Page /Parent ${ref(2)} /Resources << /Font << /F1 ${ref(3)} /F2 ${ref(4)} >> >> ` +
      `/Contents ${ref(contentNums[i])} >>`;
  });

  // 3) Serialize with a cross-reference table. All content is ASCII, so string
  // length equals byte length and the offsets line up.
  const maxObj = next - 1;
  let body = "%PDF-1.4\n";
  const offsets: number[] = new Array(maxObj + 1).fill(0);
  for (let n = 1; n <= maxObj; n++) {
    if (!objects[n]) continue;
    offsets[n] = body.length;
    body += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const xrefStart = body.length;
  body += `xref\n0 ${maxObj + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= maxObj; n++) {
    body += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${maxObj + 1} /Root ${ref(1)} >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([body], { type: "application/pdf" });
}
