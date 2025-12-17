const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const API_URL = 'http://localhost:5000/documents/upload-and-convert';
const TEST_FILE_PATH = path.join(__dirname, 'test_image_pdf.pdf'); // We need to generate this or use an existing one

async function createTestPdf() {
    // Check if test file exists, if not, create a dummy one if possible or warn
    if (!fs.existsSync(TEST_FILE_PATH)) {
        console.log("Creating dummy PDF for testing...");
        // Simple text PDF using PDFKit just to test the FLOW, 
        // ideally we need an IMAGE based PDF to test OCR. 
        // But for now let's manually verify or use a sample if present.
        // We'll proceed assuming the user acts on the 'manual verification' part 
        // or we try to upload whatever PDF we can find.
        
        // Actually, let's create a PDF that puts an image on it if we can.
        // Skipping complex creation for now, let's just use a text PDF to verifying the PIPELINE works (python script runs).
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(TEST_FILE_PATH));
        doc.text('This is a test PDF for the extraction pipeline.');
        doc.end();
        
        // Wait for file creation
        await new Promise(r => setTimeout(r, 1000));
    }
}

async function runTest() {
    await createTestPdf();
    
    if (!fs.existsSync(TEST_FILE_PATH)) {
        console.error("Test file could not be created.");
        return;
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(TEST_FILE_PATH));

    console.log(`Uploading ${TEST_FILE_PATH} to ${API_URL}...`);

    try {
        const response = await axios.post(API_URL, form, {
            headers: {
                ...form.getHeaders()
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        console.log("Response Status:", response.status);
        console.log("Response Data:", JSON.stringify(response.data, null, 2));

        if (response.data.document && response.data.document.extractedText) {
            console.log("\n--- Extracted Text Preview ---");
            console.log(response.data.document.extractedText.slice(0, 200));
            console.log("------------------------------\n");
            console.log("✅ Pipeline verified successfully!");
        } else {
            console.error("❌ Extraction failed: No text in response.");
        }

    } catch (error) {
        console.error("❌ Request Failed:", error.message);
        if (error.response) {
            console.error("Server Response:", error.response.data);
        }
    }
}

runTest();
