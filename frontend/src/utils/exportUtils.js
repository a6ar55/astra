/**
 * Utility functions for exporting data from the threat detection platform
 */

/**
 * Export data as JSON file
 * @param {Object} data - The data to export
 * @param {String} fileName - The name of the file (without extension)
 */
export const exportAsJson = (data, fileName = 'threat-data') => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Convert array of objects to CSV
 * @param {Array} data - Array of objects to convert to CSV
 * @returns {String} CSV string
 */
const convertToCSV = (data) => {
  if (!data || !data.length) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      // Handle complex objects, nulls, and escape commas
      const escaped = val === null ? '' : 
                     typeof val === 'object' ? JSON.stringify(val).replace(/"/g, '""') : 
                     String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
};

/**
 * Export data as CSV file
 * @param {Array} data - Array of objects to export as CSV
 * @param {String} fileName - The name of the file (without extension)
 */
export const exportAsCSV = (data, fileName = 'threat-data') => {
  const csvString = convertToCSV(data);
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Prepare threat data for export by making it flat (table-friendly)
 * @param {Array} historyData - Array of threat history items
 * @returns {Array} Flat array suitable for CSV export
 */
export const prepareThreatDataForExport = (historyData) => {
  if (!historyData || !historyData.length) return [];
  
  return historyData.map(item => {
    // Create a flat structure for CSV/Excel compatibility
    const flatItem = {
      date: new Date(item.timestamp).toLocaleString(),
      text: item.text,
      is_threat: item.result.threat ? 'Yes' : 'No',
      confidence: item.result.confidence ? (item.result.confidence * 100).toFixed(1) + '%' : 'N/A',
      classification: item.result.predicted_class || 'N/A',
      severity: item.result.threat ? 
        getThreatSeverityFromResult(item.result.predicted_class, item.result.confidence) : 'None'
    };
    
    return flatItem;
  });
};

/**
 * Helper function to determine threat severity
 * @param {String} threatClass - The threat classification
 * @param {Number} confidence - The confidence score (0-1)
 * @returns {String} Severity level
 */
const getThreatSeverityFromResult = (threatClass, confidence) => {
  if (!threatClass) return 'none';
  
  // Convert confidence to percentage for comparison
  const confidencePercent = confidence * 100;
  
  if (confidencePercent >= 90) {
    if (threatClass.includes('Violence') || threatClass.includes('Child')) {
      return 'Critical';
    } else {
      return 'High';
    }
  } else if (confidencePercent >= 70) {
    if (threatClass.includes('Violence') || threatClass.includes('Child')) {
      return 'High';
    } else {
      return 'Medium';
    }
  } else {
    return 'Low';
  }
}; 