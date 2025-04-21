import React, { useState } from 'react';
import FileUpload from '../components/FileUpload';
import EditableTable from '../components/EditableTable';
import { exportAssignmentsToCSV } from '../utils/csvExport';
import Logo from '../components/Logo';

const Home = ({ isDarkTheme = false }) => {
  // State for managing the whole application flow
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [extractedText, setExtractedText] = useState(null);
  const [assignments, setAssignments] = useState(null);
  const [isParsingAssignments, setIsParsingAssignments] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(1); // 1: Upload file, 2: Extract text, 3: Assignments table

  // Direct file to backend API for text extraction and then parse assignments
  const handleFileUpload = async (file) => {
    if (!file) return;

    setFileUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('syllabus', file);
      
      // Step 1: Upload file and extract text
      const textExtractionResponse = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });
      
      if (!textExtractionResponse.ok) {
        const errorData = await textExtractionResponse.json();
        throw new Error(errorData.error || 'Failed to extract text from file');
      }
      
      const textData = await textExtractionResponse.json();
      
      // Update state with text extraction results
      setUploadResult(textData);
      setExtractedText(textData.text);
      setActiveStep(2);
      
      // Step 2: Automatically parse assignments from the extracted text
      setIsParsingAssignments(true);
      
      const assignmentsResponse = await fetch('/api/parse-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textData.text }),
      });
      
      if (!assignmentsResponse.ok) {
        const errorData = await assignmentsResponse.json();
        throw new Error(errorData.error || 'Failed to parse assignments');
      }
      
      const assignmentsData = await assignmentsResponse.json();
      
      // Update state with assignment parsing results
      setAssignments(assignmentsData.assignments);
      setActiveStep(3);
      
    } catch (error) {
      console.error('Application error:', error);
      setError(error.message);
    } finally {
      setFileUploading(false);
      setIsParsingAssignments(false);
    }
  };

  const handleUploadSuccess = (data) => {
    setUploadResult(data);
    setExtractedText(data.text);
    setAssignments(null);
    setError(null);
    setActiveStep(2);
  };

  const handleUploadError = (errorMessage) => {
    setError(errorMessage);
    setUploadResult(null);
    setExtractedText(null);
    setAssignments(null);
    setActiveStep(1);
  };

  const parseAssignments = async () => {
    if (!extractedText) return;
    
    // Set state to indicate parsing has started
    setIsParsingAssignments(true);
    setError(null);
    
    // Set a timeout to handle cases where the server doesn't respond
    const timeout = setTimeout(() => {
      if (isParsingAssignments) {
        setError("Request timed out. The server took too long to respond. Please try again.");
        setIsParsingAssignments(false);
      }
    }, 60000); // 60 seconds timeout
    
    try {
      // Try both proxy and direct connection approaches
      let response;
      let succeeded = false;
      
      // First try the proxy setup
      try {
        console.log("Attempting to parse assignments via proxy...");
        
        // Add query parameter with timestamp to prevent caching
        const timestamp = new Date().getTime();
        response = await fetch(`/api/parse-assignments?t=${timestamp}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Request-Time': timestamp.toString()
          },
          body: JSON.stringify({ 
            text: extractedText,
            timestamp: timestamp // Include in body too for logging
          }),
        });
        
        if (response.ok) {
          console.log("Assignment parsing succeeded via proxy");
          const data = await response.json();
          
          // Clear the timeout since we got a response
          clearTimeout(timeout);
          
          // Update state with the assignments data
          setAssignments(data.assignments);
          setActiveStep(3);
          setIsParsingAssignments(false);
          succeeded = true;
        }
      } catch (error) {
        console.warn("Proxy attempt failed for assignment parsing:", error);
      }
      
      // Only try direct connection if proxy failed
      if (!succeeded) {
        console.log("Attempting direct API connection for parsing...");
        const API_URL = 'http://localhost:5000';
        
        try {
          // Add timestamp to prevent caching
          const timestamp = new Date().getTime();
          response = await fetch(`${API_URL}/api/parse-assignments?t=${timestamp}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'X-Request-Time': timestamp.toString()
            },
            mode: 'cors',
            body: JSON.stringify({ 
              text: extractedText,
              timestamp: timestamp
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error: ${response.status}` }));
            throw new Error(errorData.error || `Failed to parse assignments (${response.status})`);
          }
          
          const data = await response.json();
          
          // Clear the timeout since we got a response
          clearTimeout(timeout);
          
          // Update state with assignments
          setAssignments(data.assignments);
          setActiveStep(3);
          
          console.log("Direct connection succeeded");
        } catch (directError) {
          // Log the error and throw it to be caught by the outer try/catch
          console.error("Direct connection also failed:", directError);
          throw directError;
        }
      }
    } catch (error) {
      // Clear the timeout to prevent it from firing after we've already handled the error
      clearTimeout(timeout);
      
      console.error("Assignment parsing error:", error);
      setError(error.message || "Failed to parse assignments. Please try again.");
    } finally {
      // Ensure we clear the loading state
      setIsParsingAssignments(false);
    }
  };
  
  // Export assignments to CSV file
  const exportAssignments = () => {
    if (!assignments) return;
    
    const assignmentArray = Array.isArray(assignments) 
      ? assignments 
      : (assignments.items || []);
      
    exportAssignmentsToCSV(assignmentArray, `syllabus-assignments-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Start over with a new file
  const handleReset = () => {
    setUploadResult(null);
    setExtractedText(null);
    setAssignments(null);
    setError(null);
    setActiveStep(1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <Logo size="large" darkMode={isDarkTheme} className="mb-4" />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Syllabug</h1>
        <p className="font-mono text-sm text-gray-600 dark:text-gray-400">Upload your syllabus to extract assignments and due dates</p>
      </header>

      {/* Progress steps indicator */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-2">
          <div 
            className={`flex-1 h-2 rounded-l-full ${activeStep >= 1 ? 'bg-primary-500 dark:bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}
          ></div>
          <div 
            className={`flex-1 h-2 ${activeStep >= 2 ? 'bg-primary-500 dark:bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}
          ></div>
          <div 
            className={`flex-1 h-2 rounded-r-full ${activeStep >= 3 ? 'bg-primary-500 dark:bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span className={activeStep >= 1 ? 'font-medium text-primary-600 dark:text-primary-400 font-mono' : 'font-mono'}>Upload</span>
          <span className={activeStep >= 2 ? 'font-medium text-primary-600 dark:text-primary-400 font-mono' : 'font-mono'}>Extract</span>
          <span className={activeStep >= 3 ? 'font-medium text-primary-600 dark:text-primary-400 font-mono' : 'font-mono'}>Edit & Export</span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto">
        {/* Step 1: File Upload */}
        {activeStep === 1 && (
          <section className="mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Upload Syllabus</h2>
              <div className="mb-4 text-gray-600">
                <p>Upload your syllabus to extract assignments and due dates automatically.</p>
                <p className="text-sm mt-1">Supported file types: PDF and DOCX</p>
              </div>
              <FileUpload 
                onUploadSuccess={handleUploadSuccess} 
                onUploadError={handleUploadError} 
              />
              {fileUploading && (
                <div className="mt-4 flex justify-center">
                  <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <svg className="animate-spin mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-blue-700">Processing your syllabus...</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Step 2 & 3: Text Extraction and Assignment Parsing */}
        {activeStep >= 2 && uploadResult && (
          <section className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Processing Results</h2>
              <button 
                onClick={handleReset}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 text-sm"
              >
                Upload New File
              </button>
            </div>

            {/* File information */}
            <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-6">
              <div className="flex flex-wrap items-center">
                <div className="mr-6 mb-2">
                  <span className="text-gray-500 block text-sm">File:</span>
                  <span className="font-medium">{uploadResult.filename}</span>
                </div>
                <div className="mr-6 mb-2">
                  <span className="text-gray-500 block text-sm">Type:</span>
                  <span className="font-medium">{uploadResult.mimeType.split('/')[1].toUpperCase()}</span>
                </div>
                <div className="mb-2">
                  <span className="text-gray-500 block text-sm">Size:</span>
                  <span className="font-medium">{Math.round(extractedText.length / 1024)} KB text</span>
                </div>
              </div>
            </div>
                
            {/* Step 2: Extracted Text with Assignment Parsing Button */}
            {extractedText && activeStep === 2 && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Extracted Text</h3>
                  <button 
                    onClick={parseAssignments}
                    disabled={isParsingAssignments}
                    className={`px-4 py-2 rounded-md font-medium text-white 
                      ${isParsingAssignments 
                        ? 'bg-blue-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {isParsingAssignments ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Extracting Assignments...
                      </>
                    ) : 'Extract Assignments with AI'}
                  </button>
                </div>
                <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-60 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">{extractedText.slice(0, 1000)}
                  {extractedText.length > 1000 && '... (text truncated for display)'}
                  </pre>
                </div>
              </div>
            )}

            {/* Step 3: Assignments Table */}
            {assignments && activeStep === 3 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Assignments</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveStep(2)}
                      className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 text-sm"
                    >
                      Back to Text
                    </button>
                    <button 
                      onClick={exportAssignments}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Export to CSV
                    </button>
                  </div>
                </div>
                
                {assignments.items?.length > 0 || (Array.isArray(assignments) && assignments.length > 0) ? (
                  <EditableTable 
                    data={assignments} 
                    onDataChange={(updatedData) => {
                      setAssignments(Array.isArray(assignments) ? updatedData : { 
                        ...assignments,
                        items: updatedData 
                      });
                    }}
                  />
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
                    <p className="text-yellow-700">No assignments were found in this syllabus.</p>
                    <p className="text-sm text-yellow-600 mt-1">
                      You can add assignments manually using the "Add Row" button.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Error Display */}
        {error && (
          <section className="mt-6 bg-red-50 rounded-lg border border-red-200 p-6">
            <div className="flex items-start">
              <svg className="h-6 w-6 text-red-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h2 className="text-lg font-semibold text-red-700 mb-1">Error Occurred</h2>
                <p className="text-red-600">{error}</p>
                {error.includes('OpenAI') && (
                  <p className="text-sm text-red-500 mt-1">
                    Please ensure your OpenAI API key is properly configured in the backend .env file.
                  </p>
                )}
                <button 
                  onClick={handleReset}
                  className="mt-3 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
                >
                  Start Over
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer with info */}
      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>Syllabug extracts assignments from your syllabus using AI.</p>
        <p className="mt-1">Made with 🩵 by nmillrr.</p>
      </footer>
    </div>
  );
};

export default Home;