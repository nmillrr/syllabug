import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

const FileUpload = ({ onUploadSuccess, onUploadError }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  
  // Define handleUpload using useRef to prevent the circular dependency issue
  const handleUploadRef = useRef(null);
  
  // Define the actual handleUpload function
  handleUploadRef.current = async (fileToUpload) => {
    if (!fileToUpload && files.length === 0) return;
    
    const file = fileToUpload || files[0];
    const formData = new FormData();
    formData.append('syllabus', file);
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      console.log("Uploading file:", file.name);
      
      // Try both options for API URL
      // First try the proxy setup (relative URL)
      try {
        console.log("Attempting to upload via proxy");
        
        // Try a health check first
        const healthResponse = await fetch('/api/health', { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }).catch(err => {
          console.warn("Health check failed via proxy:", err);
          return { ok: false };
        });
        
        if (healthResponse.ok) {
          console.log("Health check succeeded via proxy");
          
          // If health check passes, use the proxy URL
          const response = await fetch('/api/extract-text', {
            method: 'POST',
            body: formData,
          });
          
          // If this succeeds, process the response
          if (response.ok) {
            const data = await response.json();
            setIsUploading(false);
            setFiles([]);
            if (onUploadSuccess) onUploadSuccess(data);
            return; // Exit the function
          }
        }
      } catch (error) {
        console.warn("Proxy attempt failed:", error);
      }
      
      // If the proxy attempt fails, try the direct URL
      console.log("Attempting direct API connection...");
      const API_URL = 'http://localhost:5000';
      
      // Add a very visible error message
      console.error("====================================================");
      console.error("NETWORK ERROR: Cannot connect to backend server!");
      console.error("Make sure the backend server is running at port 5000");
      console.error("====================================================");
      
      const response = await fetch(`${API_URL}/api/extract-text`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Origin': 'http://localhost:3000'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed (${response.status}): ${response.statusText}`);
      }
      
      const data = await response.json();
      setIsUploading(false);
      setFiles([]);
      if (onUploadSuccess) onUploadSuccess(data);
    } catch (error) {
      console.error("File upload error:", error);
      setIsUploading(false);
      setUploadError(error.message || "Failed to upload file. Make sure the backend server is running.");
      if (onUploadError) onUploadError(error.message || "Server error. Please check your backend server.");
    }
  };
  
  // Wrapper function to call the ref
  const handleUpload = useCallback((fileToUpload) => {
    handleUploadRef.current(fileToUpload);
  }, []);
  
  const onDrop = useCallback((acceptedFiles) => {
    setFiles(acceptedFiles);
    setUploadError(null);
    
    // Auto upload when a file is dropped
    if (acceptedFiles && acceptedFiles.length > 0) {
      setTimeout(() => {
        if (handleUploadRef.current) {
          handleUploadRef.current(acceptedFiles[0]);
        }
      }, 500); // Brief delay to show the file was selected
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
  });

  // This effect updates the handleUploadRef when files change
  useEffect(() => {
    // No need to do anything here, just making sure
    // the ref closure has access to the latest files state
  }, [files]);

  const fileRejectionItems = fileRejections.map(({ file, errors }) => (
    <li key={file.path} className="text-red-500 text-sm mt-1">
      {file.path} - {errors.map(e => e.message).join(', ')}
    </li>
  ));

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 cursor-pointer text-center transition-colors
          ${isDragActive 
            ? 'border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/30' 
            : 'border-gray-300 hover:border-primary-300 dark:border-gray-700 dark:hover:border-primary-700'}
          ${fileRejections.length > 0 ? 'border-red-500 dark:border-red-700' : ''}`}
      >
        <input {...getInputProps()} aria-label="File upload dropzone" />
        
        <div className="text-gray-500 dark:text-gray-400">
          {isDragActive ? (
            <p className="font-mono">Drop the file here...</p>
          ) : (
            <div>
              <svg xmlns="http://www.w3.org/2000/svg"
                   className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                   fill="currentColor"
                   viewBox="0 0 16 16">
                <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5"/>
                <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
              </svg>
              <p className="mt-2 text-sm font-medium font-mono text-gray-700 dark">
                Drag and drop file, or{' '}
                <span className="text-primary-600 dark:text-primary-400">click to browse</span>
              </p>
              <p className="mt-1 text-xs font-mono text-gray-500 dark:text-gray-500">PDF or DOCX (Max 10MB)</p>
            </div>
          )}
        </div>
        
        {files.length > 0 && (
          <div className="mt-4 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate font-mono">
              Selected: <span className="font-medium text-primary-600 dark:text-primary-400">{files[0].name}</span>
            </p>
          </div>
        )}
      </div>

      {fileRejectionItems.length > 0 && (
        <ul className="mt-2 font-mono">{fileRejectionItems}</ul>
      )}

      {uploadError && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400 font-mono">
          {uploadError}
        </div>
      )}

      <button
        type="button"
        onClick={() => handleUpload(files[0])}
        disabled={files.length === 0 || isUploading}
        className={`mt-4 w-full py-2 px-4 rounded-md font-medium text-white font-mono
          ${files.length === 0 || isUploading
            ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
            : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400'
          } transition-colors`}
        aria-live="polite"
      >
        {isUploading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </>
        ) : (
          'Upload Syllabus'
        )}
      </button>
    </div>
  );
};

export default FileUpload;