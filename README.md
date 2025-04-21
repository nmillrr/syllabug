# SyllaBug

SyllaBug is a web application that helps students extract and manage assignments and due dates from course syllabi.

## Features

- Upload PDF or DOCX syllabus files
- Extract text content from PDF and DOCX documents
- Extract assignments and due dates using OpenAI's GPT-4
- Display assignments in an editable table format using react-table
- Edit assignment details and add/remove assignments
- Export assignment data to CSV with a dedicated utility function

## Project Structure

```
syllabug/
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   │   ├── FileUpload.jsx  # File upload component
│   │   │   └── EditableTable.jsx # Editable assignments table component
│   │   ├── pages/              # Page components
│   │   │   └── Home.jsx        # Main page component
│   │   ├── utils/              # Utility functions
│   │   │   └── csvExport.js    # CSV export utilities
│   │   ├── App.jsx             # Main App component
│   │   ├── index.jsx           # Entry point
│   │   └── index.css           # Global styles with Tailwind directives
│   ├── package.json            # Frontend dependencies
│   └── tailwind.config.js      # Tailwind CSS configuration
├── backend/                    # Node.js Express backend
│   ├── services/               # Backend services
│   │   └── openai.js           # OpenAI API integration service
│   ├── uploads/                # Directory for uploaded files (created at runtime)
│   ├── server.js               # Express server setup
│   ├── .env                    # Environment variables (not committed to git)
│   └── package.json            # Backend dependencies
└── README.md                   # This file
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- OpenAI API key (for the AI-powered assignment extraction)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/syllabug.git
   cd syllabug
   ```

2. Set up the backend:
   ```
   cd backend
   npm install
   ```

3. Configure your OpenAI API key:
   - Rename `.env.example` to `.env` (or create a new `.env` file)
   - Add your OpenAI API key to the `.env` file:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```

4. Set up the frontend:
   ```
   cd ../frontend
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```

2. In a new terminal, start the frontend development server:
   ```
   cd frontend
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

### Usage Flow

1. **Upload:** Drag and drop a syllabus file (PDF or DOCX) onto the upload area
2. **Extract:** The app extracts text and sends it to the OpenAI API for assignment detection
3. **Edit:** View and edit the extracted assignments in an editable table
4. **Export:** Download the assignments as a CSV file for use in calendars or planners

## Technologies Used

- **Frontend**:
  - React.js
  - Tailwind CSS
  - react-dropzone for file uploads
  - react-table for the editable assignments table
  - date-fns for date formatting and validation

- **Backend**:
  - Node.js
  - Express
  - Multer for file handling
  - pdf-parse for PDF text extraction
  - mammoth for DOCX text extraction
  - OpenAI API for assignment extraction

## License

This project is licensed under the MIT License.