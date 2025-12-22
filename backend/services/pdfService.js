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
/**
 * Clean extracted text for RAG readiness
 */
function cleanExtractedText(rawText = '') {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n');

  // Remove hyphenated line breaks (OCR issue)
  text = text.replace(/(\w+)-\n(\w+)/g, '$1$2');

  // Remove page numbers markers specifically
  text = text.replace(/^\s*page\s*\d+\s*$/gim, '');

  return text.trim();
}

/**
 * Create a clean, readable PDF from extracted text, preserving structure
 */
function createPdfFromText(text, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      margin: 40,
      size: 'A4',
      autoFirstPage: true 
    });
    
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const margin = 40;
    const pageWidth = doc.page.width - margin * 2;
    
    const cleanedText = cleanExtractedText(text);

    if (!cleanedText) {
      doc.font('Times-Roman').fontSize(12).text('No readable textual content found.');
      doc.end();
      stream.on('finish', () => resolve(outputPath));
      return;
    }

    const lines = cleanedText.split('\n');
    
    doc.font('Helvetica').fontSize(10); 

    lines.forEach((line) => {
      const trimmed = line.trim();
      
      // Use Monospace for lines that look like tables (many spaces or pipes)
      const isTableLike = (line.match(/[ \t]{3,}/g) || []).length > 0 || trimmed.includes('|');
      
      if (isTableLike) {
        doc.font('Courier').fontSize(9);
      } else {
        doc.font('Helvetica').fontSize(10);
      }

      // 1. Headers (Markdown style #, ##, etc)
      if (trimmed.startsWith('#')) {
        const level = (trimmed.match(/^#+/) || ['#'])[0].length;
        const headerText = trimmed.replace(/^#+\s*/, '');
        const size = Math.max(18 - (level * 2), 12);
        
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(size).text(headerText);
        doc.font('Helvetica').fontSize(10).moveDown(0.2);
        return;
      }

      // 2. Table rows (Markdown style | col | col |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed.split('|').filter(c => c.trim().length > 0 || trimmed.includes('---'));
        
        // Skip separator rows like |---|---|
        if (trimmed.includes('---') || trimmed.includes('===')) {
          // doc.lineWidth(0.5).moveTo(doc.x, doc.y).lineTo(doc.x + pageWidth, doc.y).stroke();
          return;
        }

        const colWidth = pageWidth / Math.max(cells.length, 1);
        const startX = doc.x;
        const startY = doc.y;
        let maxHeight = 0;

        cells.forEach((cell, i) => {
          const x = startX + (i * colWidth);
          doc.fontSize(9).text(cell.trim(), x + 2, startY + 2, {
            width: colWidth - 4,
            continued: false
          });
          maxHeight = Math.max(maxHeight, doc.y - startY);
        });

        doc.y = startY + maxHeight + 2;
        return;
      }

      // 3. List items
      if (/^[\*\-\+] \s*/.test(trimmed) || /^\d+\.\s*/.test(trimmed)) {
          doc.text(line, { indent: 15 });
          return;
      }

      // 4. Regular line
      if (trimmed === '') {
        doc.moveDown(0.5);
      } else {
        doc.text(line, {
          align: 'justify',
          width: pageWidth
        });
      }

      // Handle page overflow manually if needed, though pdfkit handles most line wrapping
      if (doc.y > doc.page.height - margin * 2) {
        doc.addPage();
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
