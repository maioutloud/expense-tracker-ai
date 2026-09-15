/**
 * A minimal PDF writer — enough of the format to typeset a paginated table.
 *
 * This exists instead of a dependency for the same reason the charts are hand-rolled
 * SVG: the whole need is text, rules, and filled rectangles on A4, which is a few
 * hundred lines of a well-documented format, against ~350KB of library.
 *
 * Two details drive the design:
 *
 * 1. Cross-reference offsets are measured in BYTES. A JS string holding any character
 *    above U+00FF would encode to more bytes than it has characters, so every write
 *    goes through a Latin-1 byte writer and anything outside that range becomes "?".
 *    WinAnsiEncoding on the fonts makes bytes 128–255 render as expected.
 * 2. PDF's origin is the BOTTOM-left. Callers here work in top-left coordinates,
 *    which is the sane way to lay out a table, and the conversion happens on the
 *    way in.
 */

/** Helvetica advance widths, 1/1000 em, for codes 32–126. */
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667,
  778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556,
  556, 333, 500, 278, 556, 500, 722, 500, 500, 500,
  334, 260, 334, 584,
];

/** Helvetica-Bold advance widths, 1/1000 em, for codes 32–126. */
const HELVETICA_BOLD_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  333, 333, 584, 584, 584, 611, 975,
  722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667,
  778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  333, 278, 333, 584, 556, 333,
  556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611,
  611, 389, 556, 333, 611, 556, 778, 556, 556, 500,
  389, 280, 389, 584,
];

export type PdfFont = "regular" | "bold";

/** Width of `text` in points at `size`. */
export function measureText(
  text: string,
  size: number,
  font: PdfFont = "regular",
): number {
  const widths = font === "bold" ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS;
  let total = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    // Anything outside the measured range gets the width of a lowercase 'n'.
    const width = code >= 32 && code <= 126 ? widths[code - 32] : 556;
    total += width;
  }
  return (total / 1000) * size;
}

/** Truncates with an ellipsis so the result fits `maxWidth`. */
export function truncateToWidth(
  text: string,
  maxWidth: number,
  size: number,
  font: PdfFont = "regular",
): string {
  if (measureText(text, size, font) <= maxWidth) return text;

  const ellipsis = "...";
  const ellipsisWidth = measureText(ellipsis, size, font);
  let result = "";
  let width = 0;

  for (const char of text) {
    const charWidth = measureText(char, size, font);
    if (width + charWidth + ellipsisWidth > maxWidth) break;
    result += char;
    width += charWidth;
  }

  return `${result.trimEnd()}${ellipsis}`;
}

/** Accumulates Latin-1 bytes and tracks the exact offset for the xref table. */
class ByteWriter {
  private bytes: number[] = [];

  get length(): number {
    return this.bytes.length;
  }

  write(text: string): void {
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      this.bytes.push(code > 255 ? 63 : code); // 63 = '?'
    }
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

/** Escapes the three characters that are special inside a PDF literal string. */
function escapeString(text: string): string {
  return text.replace(/[\\()]/g, (match) => `\\${match}`);
}

function formatNumber(value: number): string {
  // PDF wants a plain decimal — no exponent notation, no trailing noise.
  return (Math.round(value * 100) / 100).toString();
}

export interface TextOptions {
  font?: PdfFont;
  size?: number;
  /** Grayscale 0 (black) to 1 (white), or an [r, g, b] triple in 0–1. */
  color?: number | [number, number, number];
  align?: "left" | "right" | "center";
}

export interface RectOptions {
  color?: number | [number, number, number];
}

export interface PdfDocumentOptions {
  width?: number;
  height?: number;
  title?: string;
}

/** A4 in points. */
export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;

export class PdfDocument {
  readonly width: number;
  readonly height: number;
  private readonly title: string;
  private pages: string[] = [];
  private current: string[] = [];

  constructor(options: PdfDocumentOptions = {}) {
    this.width = options.width ?? A4_WIDTH;
    this.height = options.height ?? A4_HEIGHT;
    this.title = options.title ?? "Expense export";
    this.addPage();
  }

  get pageCount(): number {
    return this.pages.length;
  }

  /** Flushes the page in progress, if it has anything on it, and starts a new one. */
  addPage(): void {
    if (this.current.length > 0) {
      this.pages.push(this.current.join("\n"));
    }
    this.current = [];
  }

  private setColor(color: number | [number, number, number]): string {
    if (Array.isArray(color)) {
      const [r, g, b] = color;
      return `${formatNumber(r)} ${formatNumber(g)} ${formatNumber(b)} rg`;
    }
    return `${formatNumber(color)} g`;
  }

  /** Draws text with `y` measured from the TOP of the page to the baseline. */
  text(content: string, x: number, y: number, options: TextOptions = {}): void {
    const size = options.size ?? 9;
    const font = options.font ?? "regular";
    const color = options.color ?? 0;
    const align = options.align ?? "left";

    let drawX = x;
    if (align !== "left") {
      const width = measureText(content, size, font);
      drawX = align === "right" ? x - width : x - width / 2;
    }

    const fontRef = font === "bold" ? "/F2" : "/F1";
    this.current.push(
      [
        "BT",
        this.setColor(color),
        `${fontRef} ${formatNumber(size)} Tf`,
        `1 0 0 1 ${formatNumber(drawX)} ${formatNumber(this.height - y)} Tm`,
        `(${escapeString(content)}) Tj`,
        "ET",
      ].join("\n"),
    );
  }

  /** Filled rectangle, `y` measured from the TOP of the page. */
  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    options: RectOptions = {},
  ): void {
    this.current.push(
      [
        this.setColor(options.color ?? 0.9),
        `${formatNumber(x)} ${formatNumber(this.height - y - height)} ${formatNumber(width)} ${formatNumber(height)} re`,
        "f",
      ].join("\n"),
    );
  }

  /** Horizontal hairline. */
  line(x: number, y: number, width: number, thickness = 0.5, color = 0.85): void {
    this.rect(x, y, width, thickness, { color });
  }

  private finish(): string[] {
    const pages = [...this.pages];
    if (this.current.length > 0) pages.push(this.current.join("\n"));
    return pages.length > 0 ? pages : [""];
  }

  toBlob(): Blob {
    const contents = this.finish();
    const objects: string[] = [];
    const add = (body: string) => {
      objects.push(body);
      return objects.length;
    };

    // Object numbers are assigned up front so /Kids and /Parent can reference
    // each other before the bodies are built.
    const catalogNum = 1;
    const pagesNum = 2;
    const fontRegularNum = 3;
    const fontBoldNum = 4;
    const firstPageNum = 5;

    const pageNums = contents.map((_, i) => firstPageNum + i * 2);
    const contentNums = contents.map((_, i) => firstPageNum + i * 2 + 1);

    add(`<< /Type /Catalog /Pages ${pagesNum} 0 R >>`);
    add(
      `<< /Type /Pages /Kids [${pageNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${contents.length} >>`,
    );
    add(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    );
    add(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    );

    contents.forEach((content, i) => {
      add(
        `<< /Type /Page /Parent ${pagesNum} 0 R ` +
          `/MediaBox [0 0 ${formatNumber(this.width)} ${formatNumber(this.height)}] ` +
          `/Resources << /Font << /F1 ${fontRegularNum} 0 R /F2 ${fontBoldNum} 0 R >> >> ` +
          `/Contents ${contentNums[i]} 0 R >>`,
      );
      add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });

    const infoNum = add(
      `<< /Title (${escapeString(this.title)}) /Producer (Ledger) /Creator (Ledger) >>`,
    );

    const writer = new ByteWriter();
    writer.write("%PDF-1.4\n");
    // A comment of high bytes marks the file as binary for transfer tools.
    writer.write("%\xE2\xE3\xCF\xD3\n");

    const offsets: number[] = [];
    objects.forEach((body, index) => {
      offsets[index] = writer.length;
      writer.write(`${index + 1} 0 obj\n${body}\nendobj\n`);
    });

    const xrefOffset = writer.length;
    const size = objects.length + 1;

    writer.write(`xref\n0 ${size}\n`);
    // Every xref entry is exactly 20 bytes.
    writer.write("0000000000 65535 f \n");
    for (const offset of offsets) {
      writer.write(`${String(offset).padStart(10, "0")} 00000 n \n`);
    }

    writer.write(
      `trailer\n<< /Size ${size} /Root ${catalogNum} 0 R /Info ${infoNum} 0 R >>\n` +
        `startxref\n${xrefOffset}\n%%EOF\n`,
    );

    return new Blob([writer.toUint8Array()], { type: "application/pdf" });
  }
}
