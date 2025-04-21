const express = require('express');
const multer = require('multer');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const cors = require('cors');
const { extractAssignmentsFromSyllabus } = require('./services/openai');
require('dotenv').config();

// Create Express app
const app = express();
const port = process.env.PORT || 5000;

// Get max file size from environment variable or use default (15MB)
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || 15) * 1024 * 1024;

// Configure multer for in-memory storage
const storage = multer.memoryStorage();

// File filter to only accept PDF and DOCX files
const fileFilter = (req, file, cb) => {
  // Check MIME types
  if (
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and DOCX files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: maxFileSize } // Use environment variable for file size limit
});

// Middleware
app.use(express.json({ limit: `${maxFileSize}b` }));

// Use the CORS middleware
// Allow both local development and production domains from environment variable
const allowedOrigins = [
  // Local development
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

// Add production domain from environment variable
if (process.env.CORS_ORIGIN) {
  // Split multiple origins if provided (comma-separated)
  const productionOrigins = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  allowedOrigins.push(...productionOrigins);
}

// Default production URLs
if (process.env.NODE_ENV === 'production') {
  allowedOrigins.push(
    'https://syllabug.vercel.app',
    'https://www.syllabug.vercel.app'
  );
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', version: '1.0.0' });
});

/**
 * Extract text from a PDF file buffer
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromPdf(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from a DOCX file buffer
 * @param {Buffer} buffer - DOCX file buffer
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

// Route for file upload and text extraction
app.post('/api/extract-text', upload.single('syllabus'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get the file buffer from multer memory storage
    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;
    let extractedText;

    console.log(`Processing file: ${req.file.originalname} (${mimeType})`);

    // Based on mimetype, process either PDF or DOCX
    if (mimeType === 'application/pdf') {
      console.log('Extracting text from PDF...');
      extractedText = await extractTextFromPdf(fileBuffer);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('Extracting text from DOCX...');
      extractedText = await extractTextFromDocx(fileBuffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    console.log(`Text extraction complete. Extracted ${extractedText.length} characters.`);

    // Return the extracted text
    return res.status(200).json({
      message: 'Text extraction successful',
      filename: req.file.originalname,
      mimeType: mimeType,
      text: extractedText
    });
  } catch (error) {
    console.error('Error processing file:', error);
    return res.status(500).json({ error: error.message || 'Text extraction failed' });
  }
});

// Route for parsing assignments from syllabus text
app.post('/api/parse-assignments', express.json({ limit: '15mb' }), async (req, res) => {
  // Get the request start time
  const startTime = new Date();
  const requestId = req.query.t || Date.now();
  
  console.log(`[${requestId}] Starting new assignment parsing request at ${startTime.toISOString()}`);
  
  try {
    const { text, timestamp } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Valid syllabus text is required' });
    }

    console.log(`[${requestId}] Parsing assignments from text (${text.length} characters)...`);
    console.log(`[${requestId}] OpenAI API key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);

    // Create a timeout that will send a 202 Accepted response if processing takes too long
    // This keeps the client from timing out while the server continues processing
    let timeoutId;
    let hasResponded = false;
    
    timeoutId = setTimeout(() => {
      if (!hasResponded) {
        console.log(`[${requestId}] Request processing taking a while, sending 202 Accepted...`);
        hasResponded = true;
        res.status(202).json({
          message: 'Assignment extraction in progress',
          assignments: { 
            processing: true,
            items: [
              {
                "title": "Processing Assignment Data",
                "type": "info",
                "due_date": new Date().toISOString().split('T')[0],
                "description": "Your syllabus is still being processed. This may take up to 1-2 minutes for large files."
              }
            ]
          }
        });
      }
    }, 10000); // Send a 202 response after 10 seconds
    
    // Call OpenAI to extract assignments
    try {
      const assignments = await extractAssignmentsFromSyllabus(text);
      
      // Clear the timeout since we received a response
      clearTimeout(timeoutId);
      
      // Only send a response if we haven't already sent the 202
      if (!hasResponded) {
        const assignmentCount = assignments.items ? assignments.items.length : 0;
        console.log(`[${requestId}] Assignment extraction complete. Found ${assignmentCount} assignments.`);
        
        // If no assignments were found, add a helpful message
        if (assignmentCount === 0) {
          // Add a helpful message item that explains no assignments were found
          assignments = {
            items: [
              {
                title: "No assignments found",
                type: "info",
                due_date: new Date().toISOString().split('T')[0],
                description: "No assignments with due dates were found in this syllabus. Try uploading a different syllabus file or check the text content of your document."
              }
            ]
          };
        }
        
        hasResponded = true;
        return res.status(200).json({
          message: assignmentCount > 0 ? 'Assignment extraction successful' : 'No assignments found in syllabus',
          assignments: assignments
        });
      } else {
        // If we already sent a 202, log the completed processing
        console.log(`[${requestId}] Assignment processing completed after 202 response was sent`);
      }
    } catch (aiError) {
      // Clear the timeout
      clearTimeout(timeoutId);
      
      console.error(`[${requestId}] Error from OpenAI:`, aiError);
      
      // Only send a response if we haven't already sent the 202
      if (!hasResponded) {
        hasResponded = true;
        return res.status(500).json({ 
          error: aiError.message || 'Assignment extraction failed',
          hint: 'Make sure your OpenAI API key is valid in the .env file'
        });
      }
    }
    
  } catch (error) {
    console.error(`[${requestId}] Error extracting assignments:`, error);
    // Don't return if we've already sent a response
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: error.message || 'Assignment extraction failed',
        hint: 'Make sure your OpenAI API key is valid in the .env file'
      });
    }
  } finally {
    const endTime = new Date();
    const duration = endTime - startTime;
    console.log(`[${requestId}] Request completed in ${duration}ms at ${endTime.toISOString()}`);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});