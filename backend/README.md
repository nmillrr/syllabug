# SyllaBug Backend

This is the backend server for SyllaBug, an application that extracts assignments and due dates from academic syllabi using AI.

## Features

- PDF and DOCX file parsing
- OpenAI integration for text analysis and assignment extraction
- RESTful API with Express
- CORS configuration for secure cross-origin requests
- Environment variable configuration

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- OpenAI API key

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create an `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Add your OpenAI API key to the `.env` file:

```
OPENAI_API_KEY=your_key_here
```

## Running Locally

Start the development server:

```bash
npm run dev
```

Or start the production server:

```bash
npm start
```

The server will be available at http://localhost:5000 by default.

## API Endpoints

### Health Check

```
GET /api/health
```

Returns: `{ "status": "ok", "version": "1.0.0" }`

### Extract Text from Syllabus

```
POST /api/extract-text
```

Accepts multipart/form-data with a file field named "syllabus" (PDF or DOCX format).

Returns: Extracted text content.

### Parse Assignments

```
POST /api/parse-assignments
```

Accepts JSON with a "text" field containing the syllabus text.

Returns: Structured assignment data with titles, types, dates, and descriptions.

## Deployment

### Deploy to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the service:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment Variables**: Add all variables from `.env.example`

4. Deploy

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `CORS_ORIGIN`: Frontend URL for CORS (comma-separated if multiple)
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development or production)
- `MAX_FILE_SIZE`: Maximum file upload size in MB (default: 15)

## License

MIT