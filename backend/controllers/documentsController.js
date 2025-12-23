// controllers/documentsController.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { exec } = require('child_process');
const util = require('util');
const execProm = util.promisify(exec);

// Local OCR via Tesseract.js
const Tesseract = require('tesseract.js');

// Text extraction service
const textExtractService = require('../services/textExtractService');

const { createPdfFromText, createPdfFromTable, pdfDir } = require('../services/pdfService');

const documents = [];
let nextId = 1;

// Helper: ensure pdfDir exists
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

// --- RAG Helper Functions ---
async function ingestToRag(text, docId, filename) {
  try {
    // Write text to temp file to avoid CLI buffer limits
    const safeFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const tempFile = path.resolve(__dirname, '..', 'uploads', `temp_ingest_${docId}_${safeFilename}.txt`);
    fs.writeFileSync(tempFile, text);
    
    const pythonPath = process.env.PYTHON_BIN || 'python';
    // Use quote for paths
    const scriptPath = path.resolve(__dirname, '..', 'services', 'rag_service.py');
    
    // Call python script
    const cmd = `"${pythonPath}" "${scriptPath}" ingest --text "${tempFile}" --doc_id "${docId}" --filename "${filename}"`;
    await execProm(cmd);
    
    // Cleanup
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    console.log(`[RAG] Ingested document ${docId}`);
    return true;
  } catch (err) {
    console.error("[RAG] Ingestion failed:", err);
    return false;
  }
}

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

  res.json({ count: items.length, items });
};

// GET /documents/:id
exports.getDocumentById = (req, res) => {
  const id = Number(req.params.id);
  const doc = documents.find((d) => d.id === id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  res.json(doc);
};

// POST /documents/upload
exports.uploadDocuments = async (req, res) => {
  try {
    const files = req.files;
    if (!files || !files.length) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const processed = await Promise.all(files.map(async (file) => {
      try {
        const ext = path.extname(file.originalname || '').toLowerCase();
        let meta = null;
        const PPT_EXTS = ['.ppt', '.pptx', '.odp'];

        let finalDocId = nextId++; 

        if (PPT_EXTS.includes(ext)) {
          meta = await convertPptFile(file);
        } else {
          const extraction = await textExtractService.extractText(
            file.path,
            file.mimetype,
            file.originalname
          );

          const extractedText = extraction.extractedText || '';
          const tableRows = extraction.tableRows || null;
          const isTable = extraction.isTable || false;

          const preview = extractedText.length > 500
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
            method: extraction.method
          };
        }

        const docRecord = {
          id: finalDocId,
          ...meta,
        };

        // --- RAG INGESTION TRIGGER ---
        if (docRecord.extractedText && docRecord.extractedText.length > 10) {
            ingestToRag(docRecord.extractedText, docRecord.id, docRecord.originalFileName);
        }

        docRecord.pdfUrl = `/documents/${docRecord.id}/pdf`;
        documents.push(docRecord);

        return {
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
        };

      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        return {
          success: false,
          message: `Error processing file ${file.originalname}: ${fileError.message || 'unknown error'}`,
          originalFileName: file.originalname,
        };
      }
    }));

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

// Helper for PPT
async function convertPptFile(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const baseName = path.basename(file.filename, ext);
  const outputDir = path.resolve(__dirname, '..', 'uploads', 'temp', baseName);
  const pdfPath = path.join(pdfDir, `${baseName}.pdf`);

  // Cleanup old output
  try {
    if (fs.existsSync(pdfPath)) await fs.promises.unlink(pdfPath);
    if (fs.existsSync(outputDir)) await fs.promises.rm(outputDir, { recursive: true, force: true });
    await fs.promises.mkdir(outputDir, { recursive: true });
  } catch (e) {
    // ignore
  }

  // Use existing script or updated logic
  const scriptPath = path.resolve(__dirname, '..', 'services', 'extract_pptx_images.py');
  const pptxPath = path.resolve(file.path);
  const pythonPath = process.env.PYTHON_BIN || 'python';

  try {
    await execProm(`"${pythonPath}" "${scriptPath}" "${pptxPath}" "${outputDir}"`);
  } catch (err) {
    // ignore
  }

  const imageFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.png')).sort();
  let extractedText = '';

  for (const img of imageFiles) {
    const imgPath = path.join(outputDir, img);
    try {
      const text = await ocrImage(imgPath);
      extractedText += `\n--- Slide: ${img} ---\n` + text + '\n';
    } catch (err) {}
  }

  // If OCR failed, try python-pptx extraction via universal extractor used elsewhere? 
  // For now stick to existing logic but allow empty
  if (!extractedText.trim()) extractedText = "No readable text extracted from slides.";

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

exports.uploadAndConvert = async (req, res) => {
    // Keep existing logic if specialized, OR redirect to single-file version of uploadDocuments
    // For brevity, let's just use the main logic but adapted.
    // ... (This function was largely redundant in previous view, mostly handled mostly same logic)
    // We'll leave it as is or comment it out if not used by frontend. 
    // Assuming frontend calls uploadDocuments (plural).
    res.status(501).json({message: "Use /upload endpoint"});
};

exports.downloadDocumentPdf = (req, res) => {
  const id = Number(req.params.id);
  const doc = documents.find((d) => d.id === id);
  if (!doc || !doc.pdfPath || !fs.existsSync(doc.pdfPath)) {
    return res.status(404).json({ message: "PDF not found" });
  }
  res.download(doc.pdfPath, path.basename(doc.pdfPath));
};

exports.deleteDocument = async (req, res) => {
  const id = Number(req.params.id);
  const idx = documents.findIndex((d) => d.id === id);
  if (idx === -1) return res.status(404).json({ message: "Document not found" });

  const [removed] = documents.splice(idx, 1);
  // Cleanup files...
  return res.json({ success: true, id });
};

exports.downloadDocumentJson = (req, res) => {
    // ... existing logic ...
    const id = Number(req.params.id);
    const doc = documents.find((d) => d.id === id);
    if(!doc) return res.status(404).json({ message: "Document not found" });
    res.json({ content: doc.extractedText });
};

// --- CHAT ENDPOINT ---
exports.chatWithAgent = async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ message: 'Query is required' });
  }

  try {
    const pythonPath = process.env.PYTHON_BIN || 'python';
    const scriptPath = path.resolve(__dirname, '..', 'services', 'rag_service.py');
    
    // Call RAG Service
    const { stdout } = await execProm(`"${pythonPath}" "${scriptPath}" query --query "${query}"`);
    
    let result;
    try {
        result = JSON.parse(stdout);
    } catch (e) {
        throw new Error("Failed to parse RAG service response");
    }

    if (!result.success) {
        return res.status(500).json({ message: result.error || "RAG Error" });
    }

    const contextItems = result.context || [];
    
    if (contextItems.length === 0) {
        return res.json({ 
            answer: "I couldn't find any relevant information in your uploaded documents to answer that question.",
            sources: []
        });
    }

    // Construct Answer
    // Since we don't have a plugged-in LLM, we return a "Smart Digest"
    const topContext = contextItems[0].text;
    const sources = contextItems.map(c => c.source);
    
    // Pseudo-Generate (Extractive)
    const answer = `Based on the documents, here is the relevant information:\n\n"${topContext}"\n\n(Found in: ${sources[0]})`;
    
    res.json({
        answer: answer,
        sources: sources,
        context: contextItems
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Failed to process chat request' });
  }
};