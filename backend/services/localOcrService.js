// services/localOcrService.js
const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');

function cleanExtractedText(rawText) {
  return rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 2)  // allow short lines
    .join('\n');
}




exports.extractTextFromImage = async (imagePath) => {
  try {
    const processedBuffer = await sharp(imagePath)
  .grayscale()
  .normalize()   
  .sharpen()
  .toBuffer();


    const worker = await createWorker('eng', 1, {
      logger: m => console.log(`[OCR] ${m.status}: ${m.progress}`),
    });

    const { data } = await worker.recognize(processedBuffer, {
      tessedit_pageseg_mode: 3,
    });

    await worker.terminate();

    const cleanedText = cleanExtractedText(data.text || '');

    return {
      extractedText: cleanedText,
    };
  } catch (error) {
    console.error('Tesseract OCR error:', error.message);
    return {
      extractedText: '',
      error: error.message,
    };
  }
};
