/**
 * Export engine for seat-level usage data.
 *
 * Provides CSV, PNG and PDF exports of the processed usage data and
 * dashboard visualisations. PNG/PDF capture relies on `html2canvas`
 * (dynamically imported at call time).
 */

import type { CopilotUser, UserCohort, UsageDashboardMetrics } from '@/types/usage';

// ---------------------------------------------------------------------------
// Cohort formatting
// ---------------------------------------------------------------------------

export function formatCohort(cohort: UserCohort): string {
  const labels: Record<UserCohort, string> = {
    'active': 'Active',
    'at-risk': 'At Risk',
    'dormant': 'Dormant',
    'shelfware': 'Likely Shelfware',
    'data-quality': 'Data Quality Issue',
  };
  return labels[cohort];
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

export function exportUsersToCSV(users: CopilotUser[], filename: string): void {
  const hasDepartmentData = users.some((u) => u.department !== null);

  const headers = [
    'Identifier',
    ...(hasDepartmentData ? ['Department'] : []),
    'Last Activity',
    'Days Since Activity',
    'Last Authenticated',
    'Days Since Auth',
    'Copilot Surface',
    'Activity Bucket',
    'Cohort',
    'Data Quality Issues',
  ];

  const rows = users.map((user) => [
    user.identifier,
    ...(hasDepartmentData ? [user.department || ''] : []),
    user.lastActivity?.toISOString().split('T')[0] || '',
    user.daysSinceActivity?.toString() || '',
    user.lastAuthenticated?.toISOString().split('T')[0] || '',
    user.daysSinceAuth?.toString() || '',
    user.surfaceBucket,
    user.activityBucket,
    formatCohort(user.cohort),
    user.dataQualityIssues.join('; '),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  downloadFile(csvContent, filename, 'text/csv');
}

// ---------------------------------------------------------------------------
// Color helpers (oklch / oklab → rgb for html2canvas compatibility)
// ---------------------------------------------------------------------------

function oklchToRgb(oklchStr: string): string {
  const match = oklchStr.match(
    /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\)/i,
  );
  if (!match) return oklchStr;

  const L = parseFloat(match[1]);
  const C = parseFloat(match[2]);
  const H = parseFloat(match[3]);
  const alpha = match[4]
    ? match[4].includes('%')
      ? parseFloat(match[4]) / 100
      : parseFloat(match[4])
    : 1;

  const a_ = C * Math.cos((H * Math.PI) / 180);
  const b_ = C * Math.sin((H * Math.PI) / 180);

  const l_ = L + 0.3963377774 * a_ + 0.2158037573 * b_;
  const m_ = L - 0.1055613458 * a_ - 0.0638541728 * b_;
  const s_ = L - 0.0894841775 * a_ - 1.291485548 * b_;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  r = Math.max(0, Math.min(1, r));
  g = Math.max(0, Math.min(1, g));
  b = Math.max(0, Math.min(1, b));

  const toSRGB = (c: number) =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

  r = Math.round(toSRGB(r) * 255);
  g = Math.round(toSRGB(g) * 255);
  b = Math.round(toSRGB(b) * 255);

  if (alpha < 1) return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  return `rgb(${r}, ${g}, ${b})`;
}

function oklabToRgb(oklabStr: string): string {
  const match = oklabStr.match(
    /oklab\(([\d.]+%?)\s+([-\d.]+%?)\s+([-\d.]+%?)(?:\s*\/\s*([\d.%]+))?\)/i,
  );
  if (!match) return oklabStr;

  let L = parseFloat(match[1]);
  let a = parseFloat(match[2]);
  let bVal = parseFloat(match[3]);

  if (match[1].includes('%')) L = L / 100;
  if (match[2].includes('%')) a = (a / 100) * 0.4;
  if (match[3].includes('%')) bVal = (bVal / 100) * 0.4;

  const alpha = match[4]
    ? match[4].includes('%')
      ? parseFloat(match[4]) / 100
      : parseFloat(match[4])
    : 1;

  const l_ = L + 0.3963377774 * a + 0.2158037573 * bVal;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bVal;
  const s_ = L - 0.0894841775 * a - 1.291485548 * bVal;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  r = Math.max(0, Math.min(1, r));
  g = Math.max(0, Math.min(1, g));
  b = Math.max(0, Math.min(1, b));

  const toSRGB = (c: number) =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

  r = Math.round(toSRGB(r) * 255);
  g = Math.round(toSRGB(g) * 255);
  b = Math.round(toSRGB(b) * 255);

  if (alpha < 1) return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  return `rgb(${r}, ${g}, ${b})`;
}

function convertModernColors(colorStr: string): string {
  if (!colorStr) return colorStr;

  let result = colorStr;
  result = result.replace(/oklch\([^)]+\)/gi, (match) => oklchToRgb(match));
  result = result.replace(/oklab\([^)]+\)/gi, (match) => oklabToRgb(match));
  return result;
}

// ---------------------------------------------------------------------------
// Style inlining (for html2canvas)
// ---------------------------------------------------------------------------

function inlineComputedStyles(original: Element, clone: Element): void {
  const computed = window.getComputedStyle(original);
  const colorProps = [
    'color',
    'background-color',
    'background',
    'border-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'text-decoration-color',
    'box-shadow',
    'fill',
    'stroke',
  ];

  if (clone instanceof HTMLElement || clone instanceof SVGElement) {
    colorProps.forEach((prop) => {
      const value = computed.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'transparent') {
        const rgbValue = convertModernColors(value);
        if ('style' in clone) {
          (clone as HTMLElement).style.setProperty(prop, rgbValue, 'important');
        }
      }
    });
  }

  const origChildren = Array.from(original.children);
  const cloneChildren = Array.from(clone.children);
  for (let i = 0; i < origChildren.length && i < cloneChildren.length; i++) {
    inlineComputedStyles(origChildren[i], cloneChildren[i]);
  }
}

// ---------------------------------------------------------------------------
// CSS variable injection
// ---------------------------------------------------------------------------

const CSS_VAR_NAMES = [
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--destructive-foreground',
  '--border',
  '--input',
  '--ring',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--copilot-green',
  '--copilot-green-light',
  '--warning-amber',
  '--warning-amber-light',
  '--dormant-coral',
  '--dormant-coral-light',
  '--info-blue',
  '--info-blue-light',
  '--github-purple',
  '--github-purple-light',
  '--header-bg',
  '--header-fg',
];

// ---------------------------------------------------------------------------
// Element → canvas capture
// ---------------------------------------------------------------------------

async function captureElementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import('html2canvas');

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = `${element.offsetWidth}px`;
  document.body.appendChild(container);

  const clone = element.cloneNode(true) as HTMLElement;
  container.appendChild(clone);

  // Inject RGB CSS variables
  const styleEl = document.createElement('style');
  const rootStyles = window.getComputedStyle(document.documentElement);
  const cssVars = CSS_VAR_NAMES.map((varName) => {
    const value = rootStyles.getPropertyValue(varName).trim();
    return value ? `${varName}: ${convertModernColors(value)};` : '';
  }).filter(Boolean);
  styleEl.textContent = `:root, * { ${cssVars.join(' ')} }`;
  container.insertBefore(styleEl, clone);

  inlineComputedStyles(element, clone);

  clone.style.backgroundColor = '#ffffff';

  // Fix SVG dimensions
  const svgs = clone.querySelectorAll('svg');
  const originalSvgs = element.querySelectorAll('svg');
  svgs.forEach((svg, idx) => {
    const origSvg = originalSvgs[idx];
    if (origSvg) {
      const rect = origSvg.getBoundingClientRect();
      svg.setAttribute('width', String(rect.width || 300));
      svg.setAttribute('height', String(rect.height || 200));
    }
  });

  try {
    const canvas = await html2canvas(clone, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });
    return canvas;
  } finally {
    document.body.removeChild(container);
  }
}

// ---------------------------------------------------------------------------
// PNG export
// ---------------------------------------------------------------------------

export async function exportDashboardToPNG(
  elementId: string,
  filename: string,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Dashboard element not found');

  const canvas = await captureElementToCanvas(element);
  const dataUrl = canvas.toDataURL('image/png');

  const byteString = atob(dataUrl.split(',')[1]);
  const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeString });
  downloadFile(blob, filename, mimeString);
}

// ---------------------------------------------------------------------------
// PDF export
// ---------------------------------------------------------------------------

export async function exportDashboardToPDF(
  elementId: string,
  filename: string,
  metrics: UsageDashboardMetrics,
  dataSourceName: string,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Dashboard element not found');

  const canvas = await captureElementToCanvas(element);

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  const ratio = contentWidth / imgWidth;
  const scaledHeight = imgHeight * ratio;

  const pngCanvas = document.createElement('canvas');
  pngCanvas.width = imgWidth;
  pngCanvas.height = imgHeight;
  const ctx = pngCanvas.getContext('2d');
  if (ctx) ctx.drawImage(canvas, 0, 0);

  const jpegDataUrl = pngCanvas.toDataURL('image/jpeg', 0.85);
  const jpegData = jpegDataUrl.split(',')[1];
  const jpegBytes = atob(jpegData);
  const jpegLen = jpegBytes.length;

  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 ${pageWidth} ${pageHeight}]
  /Contents 4 0 R
  /Resources <<
    /Font << /F1 5 0 R >>
    /XObject << /Img1 6 0 R >>
  >>
>>
endobj

4 0 obj
<< /Length 500 >>
stream
BT
/F1 18 Tf
${margin} ${pageHeight - margin - 20} Td
(Copilot Usage Report) Tj
ET
BT
/F1 10 Tf
${margin} ${pageHeight - margin - 40} Td
(Data Source: ${escapeForPDF(dataSourceName)}) Tj
ET
BT
/F1 10 Tf
${margin} ${pageHeight - margin - 55} Td
(Generated: ${new Date().toLocaleDateString()}) Tj
ET
BT
/F1 12 Tf
${margin} ${pageHeight - margin - 85} Td
(Summary Metrics) Tj
ET
BT
/F1 10 Tf
${margin} ${pageHeight - margin - 105} Td
(Total Seats: ${metrics.totalSeats}  |  Active: ${metrics.activeUsers}  |  Inactive: ${metrics.inactiveUsers}  |  Dormant: ${metrics.dormantUsers}) Tj
ET
BT
/F1 10 Tf
${margin} ${pageHeight - margin - 120} Td
(Active Rate: ${metrics.activeRate.toFixed(1)}%) Tj
ET
q
${contentWidth} 0 0 ${Math.min(scaledHeight, pageHeight - margin - 180)} ${margin} ${Math.max(margin, pageHeight - margin - 160 - Math.min(scaledHeight, pageHeight - margin - 180))} cm
/Img1 Do
Q
endstream
endobj

5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj

6 0 obj
<<
  /Type /XObject
  /Subtype /Image
  /Width ${imgWidth}
  /Height ${imgHeight}
  /ColorSpace /DeviceRGB
  /BitsPerComponent 8
  /Filter /DCTDecode
  /Length ${jpegLen}
>>
stream
`;

  const binaryParts: BlobPart[] = [pdfContent];

  const jpegArray = new Uint8Array(jpegLen);
  for (let i = 0; i < jpegLen; i++) {
    jpegArray[i] = jpegBytes.charCodeAt(i);
  }
  binaryParts.push(jpegArray);

  const trailer = `
endstream
endobj

7 0 obj
500
endobj

xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000314 00000 n 
0000000867 00000 n 
0000000946 00000 n 

trailer
<< /Size 8 /Root 1 0 R >>
startxref
${pdfContent.length + jpegLen + 20}
%%EOF`;

  binaryParts.push(trailer);

  const blob = new Blob(binaryParts, { type: 'application/pdf' });
  downloadFile(blob, filename, 'application/pdf');
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeForPDF(str: string): string {
  return str.replace(/[()\\]/g, '\\$&');
}
