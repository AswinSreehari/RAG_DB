// controllers/documentsController.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { exec } = require('child_process');
const util = require('util');
const execProm = util.promisify(exec);

// Local OCR via Tesseract.js (for image and slide text extraction)
const Tesseract = require('tesseract.js');

// Custom service for image OCR (optional fallback or shared logic)
const localOcrService = require('../services/localOcrService');

// CloudConvert (if you're still using for other formats)
// const cloudConvert = require('../services/cloudconvertClient');

// Text extraction service (for non-PPT/image files)
const textExtractService = require('../services/textExtractService');

const { convertPdfToImages } = require('../services/pdfToImagesService');
const { extractTextFromImage } = require("../services/localOcrService");
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// PDF creation utilities
const {
  createPdfFromText,
  createPdfFromTable,
  pdfDir,
} = require('../services/pdfService');

// Slide-based PPTX converter with OCR
// const { convertPptFile } = require('../services/convertService');

// Internal memory store
const documents = [];
let nextId = 1;


// Helper: ensure pdfDir exists
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

// Optional runtime warning if CloudConvert not configured
if (!process.env.CLOUDCONVERT_API_KEY) {
  console.warn('⚠️ CLOUDCONVERT_API_KEY not set — PPT/PPTX conversion will fail until configured.');
}
``
// GET /documents
exports.listDocuments = (req, res) => {
  const items = documents.map((doc) => ({
    id: doc.id,
    originalFileName: doc.originalFileName,
    storedFileName: doc.storedFileName,
    mimeType: doc.mimeType,
    size: doc.size,
    pdfPath: doc.pdfPath,
  }));

  res.json({
    count: items.length,
    items,
  });
};

// GET /documents/:id
exports.getDocumentById = (req, res) => {
  const id = Number(req.params.id);
  const doc = documents.find((d) => d.id === id);

  if (!doc) {
    return res.status(404).json({ message: "Document not found" });
  }

  res.json(doc);
};

// exports.uploadDocuments = async (req, res) => {
//   try {
//     const files = req.files;
//     if (!files || !files.length) {
//       return res.status(400).json({ message: "No files uploaded" });
//     }

//     const processed = [];
//     const PPT_EXTS = ['.ppt', '.pptx', '.odp'];

//     // Process files sequentially to avoid CPU/disk overload.
//     for (const file of files) {
//       try {
//         const ext = path.extname(file.originalname || '').toLowerCase();

//         let meta = null;

//         // --- PPT-like files: convert via convertPptFile (CloudConvert helper) ---
//         if (PPT_EXTS.includes(ext)) {
//           // convertPptFile should return an object:
//           // { originalFileName, storedFileName, mimeType, size, path, pdfPath, extractedText, preview, isTable, tableRows }
//           meta = await convertPptFile(file);
//         } else {
//           // --- Non-PPT: run your existing extraction + canonical PDF creation ---
//           const extraction = await textExtractService.extractText(
//             file.path,
//             file.mimetype,
//             file.originalname
//           );

//           const extractedText = extraction.extractedText || '';
//           const tableRows = extraction.tableRows || null;
//           const isTable = extraction.isTable || false;

//           const preview =
//             extractedText.length > 500
//               ? extractedText.slice(0, 500) + '...'
//               : extractedText;

//           // Build canonical PDF filename and create PDF from text/table
//           const baseName = path.basename(file.filename, path.extname(file.filename));
//           const pdfFileName = `${baseName}-canonical.pdf`;
//           const pdfPath = path.join(pdfDir, pdfFileName);

//           if (isTable && tableRows) {
//             await createPdfFromTable(tableRows, pdfPath);
//           } else {
//             await createPdfFromText(extractedText, pdfPath);
//           }

//           meta = {
//             originalFileName: file.originalname,
//             storedFileName: file.filename,
//             mimeType: file.mimetype,
//             size: file.size,
//             path: file.path,
//             pdfPath,
//             extractedText,
//             preview,
//             isTable,
//             tableRows,
//           };
//         }

//         // --- Build final in-memory record (assign id) ---
//         const docRecord = {
//           id: nextId++,
//           ...meta,
//         };

//         // Expose a stable public URL for client preview/download (do NOT expose pdfPath)
//         docRecord.pdfUrl = `/documents/${docRecord.id}/pdf`;

//         // Store in-memory
//         documents.push(docRecord);

//         // Push per-file response (expose pdfUrl, preview, etc.)
//         processed.push({
//           success: true,
//           message: "File processed successfully",
//           document: {
//             id: docRecord.id,
//             originalFileName: docRecord.originalFileName,
//             storedFileName: docRecord.storedFileName,
//             mimeType: docRecord.mimeType,
//             size: docRecord.size,
//             preview: docRecord.preview,
//             pdfUrl: docRecord.pdfUrl,
//             isTable: docRecord.isTable,
//           },
//         });
//       } catch (fileError) {
//         // Log full error server-side for debugging
//         console.error(`Error processing file ${file.originalname}:`, fileError);

//         // Return a per-file failure entry so client knows which file failed
//         processed.push({
//           success: false,
//           message: `Error processing file ${file.originalname}: ${fileError.message || 'unknown error'}`,
//           originalFileName: file.originalname,
//         });
//       }
//     }

//     // Return array of results for each file (success/failure per file)
//     return res.status(201).json({
//       message: "Files processed",
//       results: processed,
//     });
//   } catch (error) {
//     console.error("Upload (multiple) error:", error);
//     return res.status(500).json({
//       message: "Error processing uploaded files",
//       error: error.message,
//     });
//   }
// };


exports.uploadDocuments = async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('Files:', req.files);
    console.log('Body:', req.body);
    
    const files = req.files;
    if (!files || !files.length) {
      console.log('No files found in request');
      return res.status(400).json({ message: "No files uploaded" });
    }

    const processed = [];
    const PPT_EXTS = ['.ppt', '.pptx', '.odp'];
    const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.bmp', '.gif'];

    for (const file of files) {
      try {
        const ext = path.extname(file.originalname || '').toLowerCase();
        let meta = null;

        if (PPT_EXTS.includes(ext)) {
          meta = await convertPptFile(file);

        } else if (IMAGE_EXTS.includes(ext)) {
          const ocrResult = await localOcrService.extractTextFromImage(file.path);
          const extractedText = ocrResult.extractedText || '';

          const preview =
            extractedText.length > 500 ? extractedText.slice(0, 500) + '...' : extractedText;

          const baseName = path.basename(file.filename, path.extname(file.filename));
          const pdfFileName = `${baseName}.pdf`;
          const pdfPath = path.join(pdfDir, pdfFileName);

          await createPdfFromText(extractedText, pdfPath);

          meta = {
            originalFileName: file.originalname,
            storedFileName: file.filename,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            pdfPath,
            extractedText,
            preview,
            isTable: false,
            tableRows: null,
          };

        } else {
          const extraction = await textExtractService.extractText(
            file.path,
            file.mimetype,
            file.originalname
          );

          const extractedText = extraction.extractedText || '';
          const tableRows = extraction.tableRows || null;
          const isTable = extraction.isTable || false;

          const preview =
            extractedText.length > 500
              ? extractedText.slice(0, 500) + '...'
              : extractedText;

          const baseName = path.basename(file.filename, path.extname(file.filename));
          const pdfFileName = `${baseName}.pdf`;
          const pdfPath = path.join(pdfDir, pdfFileName);

          if (isTable && tableRows) {
            await createPdfFromTable(tableRows, pdfPath);
          } else {
            await createPdfFromText(extractedText, pdfPath);
          }

          meta = {
            originalFileName: file.originalname,
            storedFileName: file.filename,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            pdfPath,
            extractedText,
            preview,
            isTable,
            tableRows,
          };
        }

        const docRecord = {
          id: nextId++,
          ...meta,
        };

        docRecord.pdfUrl = `/documents/${docRecord.id}/pdf`;
        documents.push(docRecord);

        processed.push({
          success: true,
          message: "File processed successfully",
          document: {
            id: docRecord.id,
            originalFileName: docRecord.originalFileName,
            storedFileName: docRecord.storedFileName,
            mimeType: docRecord.mimeType,
            size: docRecord.size,
            preview: docRecord.preview,
            pdfUrl: docRecord.pdfUrl,
            isTable: docRecord.isTable,
          },
        });

      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);

        processed.push({
          success: false,
          message: `Error processing file ${file.originalname}: ${fileError.message || 'unknown error'}`,
          originalFileName: file.originalname,
        });
      }
    }

    return res.status(201).json({
      message: "Files processed",
      results: processed,
    });
  } catch (error) {
    console.error("Upload (multiple) error:", error);
    return res.status(500).json({
      message: "Error processing uploaded files",
      error: error.message,
    });
  }
};


async function ocrImage(imagePath) {
  const { data } = await Tesseract.recognize(imagePath, 'eng');
  return data.text;
}

exports.convertPptFile = async (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const baseName = path.basename(file.filename, ext);
  const outputDir = path.resolve('./temp', baseName);
  const pdfPath = path.join(pdfDir, `${baseName}.pdf`);

  // Cleanup old output
  try {
    if (fs.existsSync(pdfPath)) await fs.promises.unlink(pdfPath);
    if (fs.existsSync(outputDir)) await fs.promises.rm(outputDir, { recursive: true, force: true });
    await fs.promises.mkdir(outputDir, { recursive: true });
  } catch (e) {
    console.warn('Cleanup warning:', e.message);
  }

  const scriptPath = path.resolve('./services/extract_pptx_images.py');
  const pptxPath = path.resolve(file.path);
  const pythonPath = process.env.PYTHON_BIN || 'python';

  // Call Python to convert pptx → slide images
  try {
    await execProm(`"${pythonPath}" "${scriptPath}" "${pptxPath}" "${outputDir}"`);
  } catch (err) {
    console.error('Slide extraction failed:', err.message);
    throw new Error('Failed to convert PPTX to images');
  }

  // OCR each slide image
  const imageFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.png')).sort();
  let extractedText = '';

  for (const img of imageFiles) {
    const imgPath = path.join(outputDir, img);
    try {
      const text = await ocrImage(imgPath);
      extractedText += `\n--- Slide: ${img} ---\n` + text + '\n';
    } catch (err) {
      console.warn(`OCR failed on ${img}:`, err.message);
    }
  }

  if (!extractedText.trim()) {
    throw new Error('No text could be extracted from slide images.');
  }

  // Create PDF
  await createPdfFromText(extractedText, pdfPath);

  // Preview
  const preview = extractedText.length > 500 ? extractedText.slice(0, 500) + '...' : extractedText;

  return {
    originalFileName: file.originalname,
    storedFileName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
    pdfPath,
    extractedText,
    preview,
    isTable: false,
    tableRows: null,
  };
};


 
exports.uploadAndConvert = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.file;
    const ext = path.extname(file.originalname || "").toLowerCase();
    const pptExts = [".ppt", ".pptx", ".odp"];
    const baseName = path.basename(file.filename, ext);
    // The canonical PDF we want to generate
    const pdfFileName = `${baseName}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFileName);

    let extractedText = "";
    let structuredData = null;

    // 1. Handle PPT/PPTX via existing logic (CloudConvert or local python tool)
    if (pptExts.includes(ext)) {
       // Re-use existing PPT logic or the function 'convertPptFile' if applicable.
       // For now, let's assume we use the existing 'convertPptFile' helper 
       // which wraps the OTHER python script for PPTs.
       const pptResult = await exports.convertPptFile(file);
      
       // Return immediately as convertPptFile handles the response structure locally
       // or we can unify. Let's unify the response format.
       documents.push({
          id: nextId++,
          ...pptResult,
          pdfUrl: `/documents/${nextId - 1}/pdf` 
       });

       return res.status(201).json({
          message: "PPT processed successfully",
          document: {
             id: nextId - 1,
             ...pptResult,
             pdfUrl: `/documents/${nextId - 1}/pdf`
          }
       });

    } else {
      // 2. Handle PDF/Images (Standardize to PDF first if image)
      let inputPdfPath = file.path;

      // If image, convert to PDF first? Or just OCR directly?
      // The prompt specifically mentions "If a user uploads a pdf with image in it"
      // But also "what ever the document is getting uploaded... even if it is an image".
      // Let's stick to the PDF flow. If it IS an image, we should probably wrap it in PDF
      // or just trust the new Python script to handle it if we extended it.
      // For simplicity/robustness match:
      // If image -> convert to temp PDF -> process.
      // If PDF -> process directly.
      
      // CALL PYTHON SERVICE
      const pythonPath = process.env.PYTHON_BIN || 'python'; // or 'python3'
      const scriptPath = path.resolve('./services/pdf_processor.py');
      
      // We'll use execProm to call the script and capture stdout
      // Note: for very large outputs, spawn is better, but execProm is easier for JSON capture if under buffer limit.
      // We increased buffer in previous code, let's do safe here.
      
      const { stdout, stderr } = await execProm(`"${pythonPath}" "${scriptPath}" "${inputPdfPath}"`, {
          timeout: 300000, // 5 min timeout for big PDFs
          maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      });

      try {
          structuredData = JSON.parse(stdout);
      } catch (e) {
          console.error("Failed to parse Python output:", stdout.slice(0, 200) + "...");
          throw new Error("OCR Service returned invalid JSON");
      }

      if (structuredData.error) {
          throw new Error(structuredData.error);
      }

      extractedText = structuredData.full_text || "";
      
      // Generate final canonical PDF with the EXTRACTED TEXT (to make it searchable/copyable)
      // This fulfills "show the extracted data in the pdf"
      await createPdfFromText(extractedText, pdfPath);
      
      const preview = extractedText.length > 500 ? extractedText.slice(0, 500) + '...' : extractedText;

      const docRecord = {
          id: nextId++,
          originalFileName: file.originalname,
          storedFileName: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          pdfPath: pdfPath, // Valid canonical PDF
          extractedText,
          preview,
          isTable: false,  // Todo: enhance python script to detect tables
          tableRows: null,
          structuredData // Store the full page-by-page data if needed
      };

      docRecord.pdfUrl = `/documents/${docRecord.id}/pdf`;
      documents.push(docRecord);

      return res.status(201).json({
          message: "File processed with Enhanced OCR",
          document: {
              id: docRecord.id,
              originalFileName: docRecord.originalFileName,
              storedFileName: docRecord.storedFileName,
              mimeType: docRecord.mimeType,
              size: docRecord.size,
              preview: docRecord.preview,
              extractedText: docRecord.extractedText,
              structuredData: docRecord.structuredData,
              pdfUrl: docRecord.pdfUrl,
              isTable: docRecord.isTable,
          },
      });
    }

  } catch (error) {
    console.error("uploadAndConvert error:", error);
    return res.status(500).json({
      message: "Error processing file",
      error: error.message,
    });
  }
};

// GET /documents/:id/pdf
exports.downloadDocumentPdf = (req, res) => {
  const id = Number(req.params.id);
  const doc = documents.find((d) => d.id === id);

  if (!doc) {
    return res.status(404).json({ message: "Document not found" });
  }

  if (!doc.pdfPath) {
    return res.status(404).json({ message: "Canonical PDF not available" });
  }

  if (!fs.existsSync(doc.pdfPath)) {
    console.error("PDF file not found on disk:", doc.pdfPath);
    return res.status(404).json({ message: "PDF file missing on server" });
  }

  // Send the PDF file as a download
  res.download(doc.pdfPath, path.basename(doc.pdfPath), (err) => {
    if (err) {
      console.error("PDF download error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error downloading PDF" });
      }
    }
  });
};

exports.deleteDocument = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    // 'documents' should be your in-memory array declared in this module scope
    const idx = documents.findIndex((d) => d.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: "Document not found" });
    }

    // remove record
    const [removed] = documents.splice(idx, 1);

    // remove uploaded original file (if you want)
    try {
      if (removed && removed.path) {
        fs.unlink(removed.path, (err) => {
          if (err) {
            // log but don't fail the request
            console.warn(
              "Failed to unlink uploaded file:",
              removed.path,
              err.message
            );
          }
        });
      }
      // remove generated canonical pdf if exists
      if (removed && removed.pdfPath) {
        fs.unlink(removed.pdfPath, (err) => {
          if (err) {
            console.warn(
              "Failed to unlink pdf file:",
              removed.pdfPath,
              err.message
            );
          }
        });
      }
    } catch (err) {
      console.warn("Cleanup error:", err.message);
    }

    return res.json({ success: true, id });
  } catch (err) {
    console.error("DeleteDocument error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

exports.downloadDocumentPdf = (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).send('Invalid id');

    const doc = documents.find((d) => d.id === id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Ensure pdfPath exists and is a file
    const pdfPath = doc.pdfPath;
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Security: resolve real path and ensure it is inside your uploads directory
    const real = path.resolve(pdfPath);
    const uploadsRoot = path.resolve(pdfDir); // pdfDir should be the folder you wrote files into
    if (!real.startsWith(uploadsRoot)) {
      console.warn('Attempt to access file outside upload dir:', real);
      return res.status(403).json({ message: 'Access denied' });
    }

    // Stream the file with appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(doc.pdfPath)}"`);

    const stream = fs.createReadStream(real);
    stream.on('error', (err) => {
      console.error('PDF stream error:', err);
      if (!res.headersSent) res.status(500).end('Server error');
      else res.end();
    });
    stream.pipe(res);
  } catch (err) {
    console.error('downloadDocumentPdf error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// exports.downloadDocumentJson = (req, res) => {
//   const id = parseInt(req.params.id, 10);
//   const doc = documents.find((d) => d.id === id);

//   if (!doc) {
//     return res.status(404).json({ message: 'Document not found' });
//   }

//   const jsonData = {
//     id: doc.id,
//     originalFileName: doc.originalFileName,
//     storedFileName: doc.storedFileName,
//     mimeType: doc.mimeType,
//     size: doc.size,
//     extractedText: doc.extractedText,
//     preview: doc.preview,
//     isTable: doc.isTable,
//     tableRows: doc.tableRows,
//   };

//   const baseName = path.basename(doc.originalFileName, path.extname(doc.originalFileName));
//   const downloadName = `${baseName}.json`;

//   res.setHeader('Content-Type', 'application/json');
//   res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
//   res.send(JSON.stringify(jsonData, null, 2));
// };


exports.downloadDocumentJson = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const doc = documents.find((d) => d.id === id);

  if (!doc) {
    return res.status(404).json({ message: 'Document not found' });
  }

  let jsonData;

  // Case 1: Table data is available
  if (doc.isTable && Array.isArray(doc.tableRows)) {
    jsonData = {
      type: 'table',
      headers: doc.tableRows[0] || [],
      rows: doc.tableRows.slice(1),
    };
  }
  // Case 2: PPT-style slide content (slide markers detected)
  else if (doc.extractedText && doc.extractedText.includes('Slide')) {
    const slides = doc.extractedText
      .split(/Slide \d+:/)
      .map((slide) => slide.trim())
      .filter((s) => s.length > 0)
      .map((content, index) => ({
        slide: index + 1,
        content,
      }));
    jsonData = {
      type: 'slides',
      slideCount: slides.length,
      slides,
    };
  }
  // Case 3: Generic document with text
  else if (doc.extractedText) {
    jsonData = {
      type: 'text',
      content: doc.extractedText,
    };
  }
  // Fallback: no recognizable structure
  else {
    jsonData = {
      type: 'unknown',
      message: 'No structured content could be extracted from this file.',
    };
  }

  // File naming
  const baseName = path.basename(doc.originalFileName, path.extname(doc.originalFileName));
  const downloadName = `${baseName}.json`;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  res.send(JSON.stringify(jsonData, null, 2));
};
 
async function convertPptFile(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const baseName = path.basename(file.filename, ext);
  const outPdfName = `${baseName}.pdf`;
  const pdfPath = path.join(pdfDir, outPdfName);

  // Remove existing output if any
  try {
    if (fs.existsSync(pdfPath)) await fs.promises.unlink(pdfPath);
  } catch (e) {
    console.warn('Could not remove existing pdfPath:', pdfPath, e.message);
  }

  const pythonPath = process.env.PYTHON_BIN || 'python3';
  const scriptPath = path.resolve('./services/pptx_text_extractor.py');
  const pptxPath = path.resolve(file.path);

  let extractedText = '';

  try {
    const { stdout } = await execProm(`"${pythonPath}" "${scriptPath}" "${pptxPath}"`, {
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024
    });

    extractedText = stdout.trim();

    // Fallback: Run OCR if extractedText is empty
    if (!extractedText) {
      const ocrResult = await Tesseract.recognize(pptxPath, 'eng');
      extractedText = ocrResult.data.text || '';
    }

    if (!extractedText) {
      throw new Error('No text found via parser or OCR.');
    }
  } catch (error) {
    console.error('Error extracting from PPTX:', error.message);
    throw new Error('Failed to extract PPTX content via Python or OCR');
  }

  // Create PDF from extracted text
  await createPdfFromText(extractedText, pdfPath);

  const preview = extractedText.length > 500 ? extractedText.slice(0, 500) + '...' : extractedText;

  return {
    originalFileName: file.originalname,
    storedFileName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
    pdfPath,
    extractedText,
    preview,
    isTable: false,
    tableRows: null,
  };
}


// async function convertPptFile(file) {
//   const ext = path.extname(file.originalname || '').toLowerCase();
//   const baseName = path.basename(file.filename, ext);
//   const outPdfName = `${baseName}-canonical.pdf`;
//   const pdfPath = path.join(pdfDir, outPdfName);

//   // Remove existing output if any
//   try {
//     if (fs.existsSync(pdfPath)) await fs.promises.unlink(pdfPath);
//   } catch (e) {
//     console.warn('Could not remove existing pdfPath:', pdfPath, e.message);
//   }

//   const pythonPath = process.env.PYTHON_BIN || 'python3';
//   const scriptPath = path.resolve('./services/pptx_text_extractor.py');
//   const pptxPath = path.resolve(file.path);

//   let extractedText = '';

//   try {
//     const { stdout } = await execProm(`"${pythonPath}" "${scriptPath}" "${pptxPath}"`, {
//       timeout: 120000,
//       maxBuffer: 10 * 1024 * 1024
//     });

//     extractedText = stdout.trim();
//   } catch (error) {
//     console.error('[Parser] Python script error:', error.message);
//   }

//   // Fallback to OCR if needed
//   if (!extractedText) {
//     try {
//       const ocrResult = await Tesseract.recognize(pptxPath, 'eng');
//       extractedText = ocrResult.data.text || '';
//     } catch (ocrErr) {
//       console.error('[OCR] Tesseract error:', ocrErr.message);
//     }
//   }

//   if (!extractedText) {
//     throw new Error('No text found via parser or OCR.');
//   }

//   // 🔍 Clean extractedText: remove UI noise, symbols, excessive whitespace
//   extractedText = extractedText
//     .replace(/[\[\]{}()|@_=+:;*#'"~<>^]+/g, '') // remove non-informative symbols
//     .replace(/(?:Home|Insert|Design|Transitions|Animations|Slide Show|Review|View|Notes|Acrobat)[^\n]*\n?/gi, '') // common PPT UI headers
//     .replace(/(?:Click to add (title|text|notes)|Type here to search).*/gi, '')
//     .replace(/\n{2,}/g, '\n\n') // normalize paragraph breaks
//     .replace(/[^\S\r\n]{2,}/g, ' ') // collapse long spaces
//     .trim();

//   // Create PDF
//   await createPdfFromText(extractedText, pdfPath);

//   const preview = extractedText.length > 500 ? extractedText.slice(0, 500) + '...' : extractedText;

//   return {
//     originalFileName: file.originalname,
//     storedFileName: file.filename,
//     mimeType: file.mimetype,
//     size: file.size,
//     path: file.path,
//     pdfPath,
//     extractedText,
//     preview,
//     isTable: false,
//     tableRows: null,
//   };
// }
 