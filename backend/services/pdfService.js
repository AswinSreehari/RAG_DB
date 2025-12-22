const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const pdfDir = path.join(__dirname, '..', 'uploads', 'pdfs');

// Ensure the pdf directory exists
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

/**
 * Clean extracted text aggressively for RAG readiness
 */
function cleanExtractedText(rawText = '') {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n');

  // Remove hyphenated line breaks (OCR issue)
  text = text.replace(/(\w+)-\n(\w+)/g, '$1$2');

  // Remove page numbers & standalone numbers
  text = text.replace(/^\s*(page\s*\d+|\d+)\s*$/gim, '');

  // Remove headers / footers (repeated short lines)
  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();

    // Remove empty or meaningless lines
    if (!trimmed) return false;
    if (trimmed.length < 3) return false;

    // Remove OCR garbage lines
    if (!/[a-zA-Z]/.test(trimmed)) return false;
    if (/^[|_\-–—•·]+$/.test(trimmed)) return false;

    // Remove lines with too many symbols
    const symbolRatio =
      (trimmed.match(/[^a-zA-Z0-9\s.,]/g) || []).length / trimmed.length;
    if (symbolRatio > 0.4) return false;

    return true;
  });

  text = cleanedLines.join('\n');

  // Collapse multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  // Normalize spaces
  text = text.replace(/[ \t]{2,}/g, ' ');

  return text.trim();
}

/**
 * Create a clean, readable PDF from extracted text
 */
function createPdfFromText(text, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc.font('Times-Roman').fontSize(12);

    const cleanedText = cleanExtractedText(text);

    if (!cleanedText) {
      doc.text('No readable textual content found.');
      doc.end();
      stream.on('finish', () => resolve(outputPath));
      return;
    }

    const paragraphs = cleanedText.split(/\n{2,}/);

    paragraphs.forEach(para => {
      const normalized = para.replace(/\n+/g, ' ').trim();
      if (normalized.length > 20) {
        doc.text(normalized, {
          align: 'left',
          paragraphGap: 10,
        });
      }
    });

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

/**
 * Create a PDF rendering tabular data from array of objects
 */
function createPdfFromTable(rows, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const startX = doc.page.margins.left;
    let currentY = doc.page.margins.top;

    const padding = 4;
    const rowHeight = 20;
    const headerFill = '#f3f4f6';
    const altRowFill = '#f9fafb';

    if (!Array.isArray(rows) || rows.length === 0) {
      doc.text('No table data available.');
      doc.end();
      stream.on('finish', () => resolve(outputPath));
      return;
    }

    const headers = Object.keys(rows[0]);
    const colWidth = pageWidth / headers.length;

    function ensureSpaceForRow() {
      if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        currentY = doc.page.margins.top;
      }
    }

    // Header
    ensureSpaceForRow();
    headers.forEach((header, i) => {
      const x = startX + i * colWidth;
      doc.rect(x, currentY, colWidth, rowHeight)
        .fillAndStroke(headerFill, '#000');

      doc.fontSize(10)
        .fillColor('#111827')
        .text(header, x + padding, currentY + padding, {
          width: colWidth - padding * 2,
        });
    });

    currentY += rowHeight;

    // Rows
    rows.forEach((row, rowIndex) => {
      ensureSpaceForRow();
      const isAlt = rowIndex % 2 === 1;

      headers.forEach((header, i) => {
        const x = startX + i * colWidth;
        const value = row[header] !== undefined ? String(row[header]) : '';

        if (isAlt) {
          doc.rect(x, currentY, colWidth, rowHeight).fill(altRowFill);
        }

        doc.rect(x, currentY, colWidth, rowHeight).stroke();

        doc.fontSize(10)
          .fillColor('#111827')
          .text(value, x + padding, currentY + padding, {
            width: colWidth - padding * 2,
            ellipsis: true,
          });
      });

      currentY += rowHeight;
    });

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = {
  createPdfFromText,
  createPdfFromTable,
  cleanExtractedText, // <-- IMPORTANT for RAG pipeline reuse
  pdfDir,
};
