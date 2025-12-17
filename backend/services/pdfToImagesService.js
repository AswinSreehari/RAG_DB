// services/pdfToImagesService.js
const path = require("path");
const fs = require("fs");
const { PDFImage } = require("pdf-image");

async function convertPdfToImages(pdfPath, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const pdfImage = new PDFImage(pdfPath, {
    convertOptions: {
      "-density": "300",          // HIGH DPI = better OCR
      "-quality": "100"
    }
  });

  const pageCount = await pdfImage.numberOfPages();
  const imagePaths = [];

  for (let i = 0; i < pageCount; i++) {
    const imgPath = await pdfImage.convertPage(i);
    const newPath = path.join(outputDir, `page_${i + 1}.png`);
    fs.renameSync(imgPath, newPath);
    imagePaths.push(newPath);
  }

  return imagePaths;
}

module.exports = { convertPdfToImages };
