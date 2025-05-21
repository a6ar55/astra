/**
 * Utility functions for generating reports in the threat detection platform
 */
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate a PDF report of threat analysis history
 * @param {Array} historyData - Array of threat history items
 * @param {Object} userInfo - Information about the user
 */
export const generateThreatReport = (historyData, userInfo) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add report header
  addReportHeader(doc, pageWidth, userInfo);
  
  // Add threat overview section
  addThreatOverview(doc, historyData);
  
  // Add threat details table
  addThreatDetailsTable(doc, historyData);
  
  // Save the PDF
  doc.save(`threat-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Generate a PDF summary report of threat statistics
 * @param {Object} threatStats - Threat statistics
 * @param {Array} threatCategories - Threat categories with counts
 * @param {Object} userInfo - Information about the user
 */
export const generateSummaryReport = (threatStats, threatCategories, userInfo) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add report header
  addReportHeader(doc, pageWidth, userInfo, 'Threat Analysis Summary Report');
  
  // Add statistics summary
  addStatisticsSummary(doc, threatStats, threatCategories);
  
  // Save the PDF
  doc.save(`threat-summary-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

// Helper functions for report generation

/**
 * Add header to the report
 * @param {Object} doc - jsPDF document
 * @param {Number} pageWidth - Page width
 * @param {Object} userInfo - User information
 * @param {String} title - Report title, defaults to 'Threat Analysis Report'
 */
const addReportHeader = (doc, pageWidth, userInfo, title = 'Threat Analysis Report') => {
  // Logo and title
  doc.setFontSize(20);
  doc.setTextColor(30, 68, 107); // Dark blue
  doc.text(title, pageWidth / 2, 20, { align: 'center' });
  
  // Add Astra logo info
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text('ASTRA', 15, 15);
  doc.setFontSize(8);
  doc.text('Advanced Security Threat Recognition & Analysis', 35, 15);
  
  // Date and user info
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 15, 15, { align: 'right' });
  
  if (userInfo) {
    doc.text(`User: ${userInfo.name || 'N/A'}`, pageWidth - 15, 22, { align: 'right' });
    doc.text(`Email: ${userInfo.email || 'N/A'}`, pageWidth - 15, 29, { align: 'right' });
  }
  
  // Add a divider
  doc.setDrawColor(220, 220, 220);
  doc.line(15, 35, pageWidth - 15, 35);
};

/**
 * Add threat overview section to the report
 * @param {Object} doc - jsPDF document
 * @param {Array} historyData - Threat history data
 */
const addThreatOverview = (doc, historyData) => {
  doc.setFontSize(14);
  doc.setTextColor(30, 68, 107);
  doc.text('Threat Analysis Overview', 15, 45);
  
  // Calculate overview stats
  const totalAnalyzed = historyData.length;
  const threatsDetected = historyData.filter(item => item.result.threat).length;
  const threatPercentage = totalAnalyzed > 0 ? ((threatsDetected / totalAnalyzed) * 100).toFixed(1) : 0;
  
  const threatCategories = {};
  historyData.forEach(item => {
    if (item.result.threat && item.result.predicted_class) {
      threatCategories[item.result.predicted_class] = (threatCategories[item.result.predicted_class] || 0) + 1;
    }
  });
  
  // Add overview text
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Total items analyzed: ${totalAnalyzed}`, 15, 55);
  doc.text(`Threats detected: ${threatsDetected} (${threatPercentage}%)`, 15, 62);
  doc.text(`Analysis period: ${historyData.length > 0 ? 
    new Date(historyData[historyData.length - 1].timestamp).toLocaleDateString() : 'N/A'} to ${
    historyData.length > 0 ? new Date(historyData[0].timestamp).toLocaleDateString() : 'N/A'}`, 15, 69);
  
  // Add categories breakdown
  if (Object.keys(threatCategories).length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(30, 68, 107);
    doc.text('Threat Categories', 15, 82);
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    
    let y = 92;
    Object.entries(threatCategories).forEach(([category, count]) => {
      const percentage = ((count / threatsDetected) * 100).toFixed(1);
      doc.text(`${category}: ${count} (${percentage}%)`, 20, y);
      y += 7;
    });
  }
};

/**
 * Add threat details table to the report
 * @param {Object} doc - jsPDF document
 * @param {Array} historyData - Threat history data
 */
const addThreatDetailsTable = (doc, historyData) => {
  // Add a section title
  doc.setFontSize(14);
  doc.setTextColor(30, 68, 107);
  doc.text('Threat Analysis Details', 15, 120);
  
  // Format data for the table
  const tableData = historyData.map(item => {
    return [
      new Date(item.timestamp).toLocaleString(),
      item.result.threat ? 'Yes' : 'No',
      item.result.predicted_class || 'N/A',
      item.result.confidence ? `${(item.result.confidence * 100).toFixed(1)}%` : 'N/A',
      item.result.threat ? getThreatSeverityFromResult(item.result.predicted_class, item.result.confidence) : 'None',
      item.text.length > 40 ? item.text.substring(0, 40) + '...' : item.text
    ];
  });
  
  // Generate the table
  doc.autoTable({
    startY: 130,
    head: [['Date', 'Threat', 'Classification', 'Confidence', 'Severity', 'Content']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 68, 107],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    },
    margin: { top: 130 }
  });
};

/**
 * Add statistics summary to the report
 * @param {Object} doc - jsPDF document
 * @param {Object} threatStats - Threat statistics
 * @param {Array} threatCategories - Threat categories with counts
 */
const addStatisticsSummary = (doc, threatStats, threatCategories) => {
  doc.setFontSize(14);
  doc.setTextColor(30, 68, 107);
  doc.text('Threat Statistics Summary', 15, 45);
  
  // Add main statistics
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Total items analyzed: ${threatStats.totalAnalyzed}`, 15, 55);
  doc.text(`Threats detected: ${threatStats.threatsDetected}`, 15, 62);
  doc.text(`High severity threats: ${threatStats.highSeverity}`, 15, 69);
  doc.text(`Average confidence: ${threatStats.averageConfidence}%`, 15, 76);
  doc.text(`Last updated: ${threatStats.lastUpdated}`, 15, 83);
  
  // Add categories table
  doc.setFontSize(14);
  doc.setTextColor(30, 68, 107);
  doc.text('Threat Categories Distribution', 15, 100);
  
  const tableData = threatCategories.map(category => {
    return [
      category.category,
      category.count,
      `${category.percentage}%`,
      category.trend === 'up' ? 'Increasing' : 
      category.trend === 'down' ? 'Decreasing' : 'Stable'
    ];
  });
  
  // Generate the table
  doc.autoTable({
    startY: 110,
    head: [['Category', 'Count', 'Percentage', 'Trend']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 68, 107],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    },
    margin: { top: 110 }
  });
};

/**
 * Helper function to determine threat severity (copied from exportUtils for consistency)
 * @param {String} threatClass - The threat classification
 * @param {Number} confidence - The confidence score (0-1)
 * @returns {String} Severity level
 */
const getThreatSeverityFromResult = (threatClass, confidence) => {
  if (!threatClass) return 'None';
  
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