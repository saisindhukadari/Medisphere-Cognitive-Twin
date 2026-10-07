/**
 * Lightweight, dependency-free export helpers used by the care-plan viewer and
 * the reports page (client-side generation from backend data, so downloads work
 * without exposing credentials in link URLs).
 */

export interface PdfSection {
  heading: string;
  lines: string[];
}

/** ASCII-safe text (the built-in PDF Helvetica font only covers Latin-1). */
function toPdfText(input: string): string {
  const map: Record<string, string> = {
    '—': '-', '–': '-', '‘': "'", '’': "'", '“': '"', '”': '"',
    '•': '-', '·': '-', '≥': '>=', '≤': '<=', '→': '->', '↓': 'v',
    '↑': '^', '✓': '[ok]', '⚠': '!', '❤️': '', '🩸': '', '●': 'o', '…': '...',
    ' ': ' ', '🧪': '', '📊': '', '📡': '', '🧬': '', '✚': '+', '⚠️': '!',
  };
  let out = '';
  for (const ch of input) {
    if (map[ch] !== undefined) {
      out += map[ch];
      continue;
    }
    const code = ch.codePointAt(0) ?? 63;
    out += code >= 32 && code <= 255 ? ch : '?';
  }
  // PDF string escapes
  return out.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrap(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > max) {
      lines.push(current.trim());
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Builds a real, openable multi-page PDF (Helvetica) from structured sections.
 * Returns a Blob ready for download.
 */
export function buildPdf(title: string, subtitle: string, sections: PdfSection[]): Blob {
  const W = 595;
  const H = 842;
  const LEFT = 50;
  const TOP = 792;
  const BOTTOM = 56;
  const LH = 13.5;

  type Op = { text: string; size: number; bold?: boolean; gap?: number };
  const ops: Op[] = [];

  ops.push({ text: title, size: 18, bold: true, gap: 6 });
  ops.push({ text: subtitle, size: 10, gap: 4 });
  ops.push({ text: `Generated: ${new Date().toISOString()}`, size: 9, gap: 12 });

  for (const s of sections) {
    ops.push({ text: s.heading.toUpperCase(), size: 12, bold: true, gap: 6 });
    for (const line of s.lines) {
      if (line === '') {
        ops.push({ text: '', size: 9, gap: 5 });
      } else {
        for (const w of wrap(line, 92)) ops.push({ text: w, size: 10, gap: LH });
      }
    }
    ops.push({ text: '', size: 8, gap: 8 });
  }

  // paginate
  const pages: Op[][] = [];
  let cursor = TOP;
  let page: Op[] = [];
  for (const op of ops) {
    const height = op.gap ?? LH;
    if (cursor - height < BOTTOM) {
      pages.push(page);
      page = [];
      cursor = TOP;
    }
    page.push(op);
    cursor -= height;
  }
  if (page.length) pages.push(page);
  if (!pages.length) pages.push([{ text: title, size: 14, bold: true }]);

  const fontBold = 3 + pages.length * 2;
  const fontRegular = fontBold + 1;

  const objects: string[] = [];
  const pageObjIds = pages.map((_, i) => 3 + i * 2);

  objects.push(`<< /Type /Catalog /Pages 2 0 R >>`);
  objects.push(`<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);

  pages.forEach((opsPage, i) => {
    const pageId = 3 + i * 2;
    const contentId = pageId + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] ` +
        `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    let y = TOP;
    let content = '';
    for (const op of opsPage) {
      y -= op.gap ?? LH;
      if (!op.text) continue;
      const font = op.bold ? 'F2' : 'F1';
      content += `BT /${font} ${op.size} Tf ${LEFT} ${y.toFixed(1)} Td (${toPdfText(op.text)}) Tj ET\n`;
    }
    content += `${LEFT} ${(TOP + 14).toFixed(1)} Td\n0 -0.78 RG 545 0 re S\n`;
    content += `${LEFT} ${BOTTOM + 14} Td\n0.5 0.5 0.5 rg\nBT /F1 8 Tf ${LEFT} ${BOTTOM - 6} Td ` +
      `(MediSphere Cognitive Twin - generated document.) Tj ET\n`;
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}endstream`);
  });

  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`);

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, idx) => {
    offsets.push(pdf.length);
    pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: 'application/pdf' });
}

export function saveBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const csv =
    [header.map(csvCell).join(',')].concat(rows.map((r) => r.map(csvCell).join(','))).join('\r\n') +
    '\r\n\r\n"MediSphere export - generated from the patient record at export time."\r\n';
  saveBlob(filename, new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
}

export function downloadText(filename: string, text: string) {
  saveBlob(filename, new Blob([text], { type: 'text/plain;charset=utf-8' }));
}

/** Authenticated export: fetches a backend CSV with the JWT attached. */
export async function downloadAuthenticated(path: string, filename: string): Promise<void> {
  const token = sessionStorage.getItem('ms_token') ?? localStorage.getItem('ms_token');
  const res = await fetch(`/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed (HTTP ${res.status})`);
  const blob = await res.blob();
  saveBlob(filename, blob);
}
