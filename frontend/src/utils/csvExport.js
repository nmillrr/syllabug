/**
 * Converts an array of assignment objects to a CSV string and triggers a download
 * @param {Array} assignments - Array of assignment objects with title, type, due_date, etc.
 * @param {string} [filename="assignments.csv"] - The name of the downloaded file
 */
export function exportAssignmentsToCSV(assignments, filename = "assignments.csv") {
  if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
    console.warn("No data to export");
    return;
  }

  try {
    // Define the CSV headers
    const headers = ["Title", "Type", "Due Date", "Start Date", "Description"];
    
    // Create CSV rows from the data
    const csvRows = [
      // Header row
      headers.join(','),
      
      // Data rows - properly escape and format each field
      ...assignments.map(assignment => [
        // Escape quotes and wrap in quotes to handle commas in content
        `"${(assignment.title || '').replace(/"/g, '""')}"`,
        `"${(assignment.type || '').replace(/"/g, '""')}"`,
        `"${assignment.due_date || ''}"`,
        `"${assignment.start_date || ''}"`,
        `"${(assignment.description || '').replace(/"/g, '""')}"`
      ].join(','))
    ];
    
    // Join all rows with newlines
    const csvString = csvRows.join('\n');
    
    // Create a Blob with the CSV data
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    // Use browser download API
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      // For IE
      window.navigator.msSaveOrOpenBlob(blob, filename);
    } else {
      // For other browsers
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Append to the document temporarily, click, then remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    }
    
    return true;
  } catch (error) {
    console.error("Failed to export CSV:", error);
    return false;
  }
}

/**
 * Alternative implementation using the FileSaver.js library
 * Requires installing: npm install file-saver
 * 
 * @param {Array} assignments - Array of assignment objects
 * @param {string} [filename="assignments.csv"] - The name of the downloaded file
 */
export function exportAssignmentsWithFileSaver(assignments, filename = "assignments.csv") {
  // NOTE: This function requires the file-saver package
  // If you're using this function, make sure to:
  // 1. Install it with: npm install file-saver
  // 2. Import it at the top of this file with: import { saveAs } from 'file-saver';
  
  if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
    console.warn("No data to export");
    return;
  }
  
  try {
    // This import would be needed at the top of the file
    // import { saveAs } from 'file-saver';
    
    // Define the CSV headers
    const headers = ["Title", "Type", "Due Date", "Start Date", "Description"];
    
    // Create CSV rows from the data
    const csvRows = [
      // Header row
      headers.join(','),
      
      // Data rows
      ...assignments.map(assignment => [
        `"${(assignment.title || '').replace(/"/g, '""')}"`,
        `"${(assignment.type || '').replace(/"/g, '""')}"`,
        `"${assignment.due_date || ''}"`,
        `"${assignment.start_date || ''}"`,
        `"${(assignment.description || '').replace(/"/g, '""')}"`
      ].join(','))
    ];
    
    // Join all rows with newlines
    const csvString = csvRows.join('\n');
    
    // Create a Blob with the CSV data
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    // Use FileSaver to save the file
    // saveAs(blob, filename);
    
    return true;
  } catch (error) {
    console.error("Failed to export CSV:", error);
    return false;
  }
}