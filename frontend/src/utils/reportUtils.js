/**
 * Utility functions for generating reports in the threat detection platform
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Determine threat severity based on classification and confidence
 * @param {String} threatClass - The predicted threat class
 * @param {Number} confidence - The confidence score (0-1)
 * @returns {String} Severity level
 */
const getThreatSeverityFromResult = (threatClass, confidence) => {
  if (!threatClass || threatClass === 'Non-threat/Neutral') return 'None';
  
  const confidencePercent = (confidence || 0) * 100;
  const highRiskClasses = ['Direct Violence Threats', 'Child Safety Threats'];
  
  if (confidencePercent >= 90) return 'CRITICAL';
  if (confidencePercent >= 80) return 'HIGH';
  if (confidencePercent >= 60) return 'MEDIUM';
  if (highRiskClasses.includes(threatClass) && confidencePercent >= 50) return 'HIGH';
  return 'LOW';
};

/**
 * Generate a law enforcement style threat report
 * @param {Array} historyData - Array of threat history items
 * @param {Object} userInfo - Information about the user
 * @param {Boolean} returnAsObject - If true, return report data instead of generating PDF
 * @returns {Object|void} Report data object if returnAsObject is true
 */
export const generateThreatReport = (historyData, userInfo, returnAsObject = false) => {
  const reportId = `TR-${Date.now().toString().slice(-8)}`;
  const currentDate = new Date();
  const threats = historyData.filter(item => item.threat || (item.result && item.result.threat));
  
  // Calculate statistics
  const totalAnalyzed = historyData.length;
  const threatsDetected = threats.length;
  const threatPercentage = totalAnalyzed > 0 ? ((threatsDetected / totalAnalyzed) * 100).toFixed(1) : 0;
  const criticalThreats = threats.filter(item => {
    const confidence = item.confidence || (item.result && item.result.confidence) || 0;
    const predictedClass = item.predicted_class || (item.result && item.result.predicted_class) || '';
    return getThreatSeverityFromResult(predictedClass, confidence) === 'CRITICAL';
  }).length;
  
  // Categorize threats
  const threatCategories = {};
  threats.forEach(item => {
    const className = item.predicted_class || (item.result && item.result.predicted_class) || 'Unknown';
    threatCategories[className] = (threatCategories[className] || 0) + 1;
  });
  
  // Prepare threat details
  const threatDetails = threats.map((item, index) => {
    const confidence = item.confidence || (item.result && item.result.confidence) || 0;
    const predictedClass = item.predicted_class || (item.result && item.result.predicted_class) || 'Unknown';
    const severity = getThreatSeverityFromResult(predictedClass, confidence);
    const timestamp = item.timestamp || new Date().toISOString();
    
    return {
      incident_id: `INC-${Date.now().toString().slice(-6)}-${index + 1}`,
      timestamp: new Date(timestamp).toLocaleString(),
      content: item.text || 'No content provided',
      classification: predictedClass,
      confidence: `${(confidence * 100).toFixed(1)}%`,
      severity_level: severity,
      risk_assessment: severity === 'CRITICAL' ? 'IMMEDIATE ACTION REQUIRED' :
                      severity === 'HIGH' ? 'PRIORITY FOLLOW-UP' :
                      severity === 'MEDIUM' ? 'MONITOR CLOSELY' : 'ROUTINE REVIEW',
      metadata: item.twitter_metadata || null
    };
  });
  
  // Create report object
  const reportData = {
    report_id: reportId,
    report_type: 'THREAT_ANALYSIS_REPORT',
    classification_level: 'OFFICIAL_USE_ONLY',
    generated_by: 'Astra Threat Detection Platform',
    analyst: userInfo.name || 'System User',
    analyst_email: userInfo.email || 'N/A',
    generation_date: currentDate.toISOString(),
    report_period: {
      start_date: historyData.length > 0 ? new Date(historyData[historyData.length - 1].timestamp).toLocaleDateString() : 'N/A',
      end_date: historyData.length > 0 ? new Date(historyData[0].timestamp).toLocaleDateString() : 'N/A'
    },
    executive_summary: {
      total_items_analyzed: totalAnalyzed,
      threats_detected: threatsDetected,
      threat_detection_rate: `${threatPercentage}%`,
      critical_threats: criticalThreats,
      high_priority_categories: Object.entries(threatCategories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category, count]) => ({ category, count }))
    },
    threat_breakdown: {
      by_category: threatCategories,
      by_severity: threats.reduce((acc, item) => {
        const confidence = item.confidence || (item.result && item.result.confidence) || 0;
        const predictedClass = item.predicted_class || (item.result && item.result.predicted_class) || '';
        const severity = getThreatSeverityFromResult(predictedClass, confidence);
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      }, {})
    },
    detailed_incidents: threatDetails,
    recommendations: generateRecommendations(threats, threatCategories, criticalThreats),
    appendices: {
      methodology: "Two-stage DistilBERT classification pipeline with 96.69% accuracy",
      confidence_thresholds: "CRITICAL: ≥90%, HIGH: ≥80%, MEDIUM: ≥60%, LOW: <60%",
      data_sources: threats.some(t => t.twitter_metadata) ? "Direct input analysis, Social media monitoring" : "Direct input analysis"
    }
  };
  
  if (returnAsObject) {
    return reportData;
  }
  
  // Generate PDF report
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add law enforcement style header
  addLawEnforcementHeader(doc, pageWidth, reportData);
  
  // Add executive summary
  addExecutiveSummary(doc, reportData);
  
  // Add threat analysis
  addThreatAnalysis(doc, reportData);
  
  // Add detailed incidents table
  addIncidentDetailsTable(doc, reportData.detailed_incidents);
  
  // Add recommendations
  addRecommendations(doc, reportData.recommendations);
  
  // Save the PDF
  doc.save(`threat-analysis-report-${reportId}.pdf`);
};

/**
 * Generate a law enforcement style summary report
 * @param {Object} threatStats - Threat statistics
 * @param {Array} threatCategories - Threat categories with counts
 * @param {Object} userInfo - Information about the user
 * @param {Boolean} returnAsObject - If true, return report data instead of generating PDF
 * @returns {Object|void} Report data object if returnAsObject is true
 */
export const generateSummaryReport = (threatStats, threatCategories, userInfo, returnAsObject = false) => {
  const reportId = `SR-${Date.now().toString().slice(-8)}`;
  const currentDate = new Date();
  
  // Calculate additional metrics
  const threatDetectionRate = threatStats.totalAnalyzed > 0 ? 
    ((threatStats.threatsDetected / threatStats.totalAnalyzed) * 100).toFixed(1) : 0;
  
  const riskLevel = threatStats.highSeverity > 5 ? 'HIGH' :
                   threatStats.highSeverity > 2 ? 'MEDIUM' : 'LOW';
  
  // Create summary report object
  const reportData = {
    report_id: reportId,
    report_type: 'INTELLIGENCE_SUMMARY',
    classification_level: 'OFFICIAL_USE_ONLY',
    generated_by: 'Astra Threat Detection Platform',
    analyst: userInfo.name || 'System User',
    analyst_email: userInfo.email || 'N/A',
    generation_date: currentDate.toISOString(),
    assessment_period: threatStats.lastUpdated || 'Ongoing',
    
    threat_landscape_overview: {
      overall_risk_level: riskLevel,
      total_assessments_conducted: threatStats.totalAnalyzed,
      confirmed_threats: threatStats.threatsDetected,
      threat_detection_rate: `${threatDetectionRate}%`,
      high_severity_incidents: threatStats.highSeverity,
      average_threat_confidence: `${threatStats.averageConfidence}%`,
      trend_indicator: threatStats.recentChange > 0 ? 'INCREASING' : 
                      threatStats.recentChange < 0 ? 'DECREASING' : 'STABLE'
    },
    
    category_analysis: threatCategories.map(category => ({
      threat_type: category.category,
      incident_count: category.count,
      percentage_of_total: `${category.percentage}%`,
      trend: category.trend.toUpperCase(),
      risk_assessment: category.count > 10 ? 'HIGH VOLUME' :
                      category.count > 5 ? 'MODERATE' : 'LOW VOLUME'
    })),
    
    key_findings: generateKeyFindings(threatStats, threatCategories),
    
    immediate_actions_required: generateImmediateActions(threatStats, threatCategories, riskLevel),
    
    intelligence_gaps: [
      "Geolocation data for threat attribution",
      "Historical pattern analysis beyond current dataset",
      "Cross-platform correlation analysis"
    ],
    
    next_assessment: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
  };
  
  if (returnAsObject) {
    return reportData;
  }
  
  // Generate PDF report
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add law enforcement style header
  addLawEnforcementHeader(doc, pageWidth, reportData);
  
  // Add threat landscape overview
  addThreatLandscapeOverview(doc, reportData);
  
  // Add category analysis
  addCategoryAnalysisTable(doc, reportData.category_analysis);
  
  // Add key findings and actions
  addKeyFindingsAndActions(doc, reportData);
  
  // Save the PDF
  doc.save(`intelligence-summary-${reportId}.pdf`);
};

// Helper functions for law enforcement style formatting

const addLawEnforcementHeader = (doc, pageWidth, reportData) => {
  // Top classification banner
  doc.setFillColor(220, 53, 69); // Red background
  doc.rect(0, 0, pageWidth, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('● ' + reportData.classification_level + ' ●', pageWidth / 2, 10, { align: 'center' });
  
  // Agency logo area (placeholder for shield/badge)
  doc.setDrawColor(44, 62, 80);
  doc.setLineWidth(2);
  doc.circle(30, 30, 8);
  doc.setTextColor(44, 62, 80);
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text('ASTRA', 30, 32, { align: 'center' });
  
  // Agency header
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('ASTRA INTELLIGENCE DIVISION', pageWidth / 2, 28, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.text('Advanced Social Threat Recognition & Analysis', pageWidth / 2, 38, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(reportData.report_type, pageWidth / 2, 50, { align: 'center' });
  
  // Report details box with enhanced styling
  doc.setDrawColor(44, 62, 80);
  doc.setLineWidth(1);
  doc.rect(15, 55, pageWidth - 30, 30);
  
  // Header for details box
  doc.setFillColor(248, 249, 250);
  doc.rect(15, 55, pageWidth - 30, 8, 'F');
  doc.setTextColor(44, 62, 80);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('REPORT DETAILS', pageWidth / 2, 61, { align: 'center' });
  
  // Report details content
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Report ID: ${reportData.report_id}`, 20, 70);
  doc.text(`Generated: ${new Date(reportData.generation_date).toLocaleString()}`, 20, 76);
  doc.text(`Analyst: ${reportData.analyst}`, 20, 82);
  doc.text(`Contact: ${reportData.analyst_email}`, pageWidth - 20, 70, { align: 'right' });
  doc.text(`Classification: ${reportData.classification_level}`, pageWidth - 20, 76, { align: 'right' });
  doc.text(`Status: FINAL`, pageWidth - 20, 82, { align: 'right' });
  
  // Bottom classification footer
  doc.setFillColor(220, 53, 69);
  doc.rect(0, doc.internal.pageSize.getHeight() - 10, pageWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('● ' + reportData.classification_level + ' ●', pageWidth / 2, doc.internal.pageSize.getHeight() - 3, { align: 'center' });
};

const addExecutiveSummary = (doc, reportData) => {
  let yPos = 95;
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('EXECUTIVE SUMMARY', 15, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  const summary = reportData.executive_summary;
  doc.text(`Analysis Period: ${reportData.report_period.start_date} to ${reportData.report_period.end_date}`, 15, yPos);
  yPos += 6;
  doc.text(`Total Items Analyzed: ${summary.total_items_analyzed}`, 15, yPos);
  yPos += 6;
  doc.text(`Threats Detected: ${summary.threats_detected} (${summary.threat_detection_rate})`, 15, yPos);
  yPos += 6;
  doc.text(`Critical Incidents: ${summary.critical_threats}`, 15, yPos);
  yPos += 6;
  
  if (summary.high_priority_categories.length > 0) {
    doc.text('Primary Threat Categories:', 15, yPos);
    yPos += 6;
    summary.high_priority_categories.forEach(cat => {
      doc.text(`• ${cat.category}: ${cat.count} incidents`, 20, yPos);
      yPos += 5;
    });
  }
};

const addThreatAnalysis = (doc, reportData) => {
  const yPos = 175;
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('THREAT ANALYSIS', 15, yPos);
  
  // Add severity breakdown
  const severityData = Object.entries(reportData.threat_breakdown.by_severity).map(([severity, count]) => [
    severity, count, `${((count / reportData.executive_summary.threats_detected) * 100).toFixed(1)}%`
  ]);
  
  autoTable(doc, {
    startY: yPos + 5,
    head: [['Severity Level', 'Count', 'Percentage']],
    body: severityData,
    theme: 'grid',
    headStyles: { 
      fillColor: [52, 58, 64], 
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    margin: { left: 15, right: 15 }
  });
};

const addIncidentDetailsTable = (doc, incidents) => {
  const tableData = incidents.slice(0, 20).map(incident => [
    incident.incident_id,
    incident.timestamp,
    incident.classification,
    incident.severity_level,
    incident.risk_assessment,
    incident.content.length > 50 ? incident.content.substring(0, 50) + '...' : incident.content
  ]);
  
  doc.addPage();
  
  // Add header to new page
  addLawEnforcementHeader(doc, doc.internal.pageSize.getWidth(), {
    classification_level: 'OFFICIAL_USE_ONLY',
    report_type: 'THREAT ANALYSIS REPORT - INCIDENT DETAILS',
    report_id: 'CONTINUED',
    generation_date: new Date().toISOString(),
    analyst: 'System Generated',
    analyst_email: 'system@astra.gov'
  });
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('INCIDENT DETAILS', 15, 95);
  
  autoTable(doc, {
    startY: 105,
    head: [['Incident ID', 'Timestamp', 'Classification', 'Severity', 'Risk Level', 'Content Summary']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [52, 58, 64], 
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold'
    },
    styles: { 
      fontSize: 8,
      cellPadding: 2,
      lineColor: [44, 62, 80],
      lineWidth: 0.1
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250]
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 25 },
      2: { cellWidth: 30 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 75 }
    }
  });
};

const addThreatLandscapeOverview = (doc, reportData) => {
  let yPos = 95;
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('THREAT LANDSCAPE OVERVIEW', 15, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  const overview = reportData.threat_landscape_overview;
  doc.text(`Overall Risk Level: ${overview.overall_risk_level}`, 15, yPos);
  yPos += 6;
  doc.text(`Total Assessments: ${overview.total_assessments_conducted}`, 15, yPos);
  yPos += 6;
  doc.text(`Confirmed Threats: ${overview.confirmed_threats}`, 15, yPos);
  yPos += 6;
  doc.text(`Detection Rate: ${overview.threat_detection_rate}`, 15, yPos);
  yPos += 6;
  doc.text(`High Severity: ${overview.high_severity_incidents}`, 15, yPos);
  yPos += 6;
  doc.text(`Trend: ${overview.trend_indicator}`, 15, yPos);
};

const addCategoryAnalysisTable = (doc, categoryAnalysis) => {
  const tableData = categoryAnalysis.map(cat => [
    cat.threat_type,
    cat.incident_count,
    cat.percentage_of_total,
    cat.trend,
    cat.risk_assessment
  ]);
  
  autoTable(doc, {
    startY: 150,
    head: [['Threat Type', 'Count', 'Percentage', 'Trend', 'Risk Assessment']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [52, 58, 64], 
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [44, 62, 80],
      lineWidth: 0.1
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250]
    },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' }
    },
    margin: { left: 15, right: 15 },
    didDrawPage: function(data) {
      doc.lastTableY = data.cursor.y;
    }
  });
};

const addKeyFindingsAndActions = (doc, reportData) => {
  let yPos = doc.lastTableY ? doc.lastTableY + 20 : 200;
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('KEY FINDINGS', 15, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  reportData.key_findings.forEach(finding => {
    doc.text(`• ${finding}`, 20, yPos);
    yPos += 6;
  });
  
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('IMMEDIATE ACTIONS REQUIRED', 15, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  reportData.immediate_actions_required.forEach(action => {
    doc.text(`• ${action}`, 20, yPos);
    yPos += 6;
  });
};

const addRecommendations = (doc, recommendations) => {
  doc.addPage();
  let yPos = 20;
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('RECOMMENDATIONS', 15, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  recommendations.forEach(rec => {
    doc.text(`• ${rec}`, 20, yPos);
    yPos += 6;
  });
};

// Helper functions for generating content
const generateRecommendations = (threats, threatCategories, criticalThreats) => {
  const recommendations = [];
  
  if (criticalThreats > 0) {
    recommendations.push(`URGENT: ${criticalThreats} critical threat(s) require immediate investigation and response.`);
  }
  
  if (threats.length > 10) {
    recommendations.push('Consider implementing automated monitoring for high-volume threat detection.');
  }
  
  const topCategory = Object.entries(threatCategories).sort(([,a], [,b]) => b - a)[0];
  if (topCategory && topCategory[1] > 5) {
    recommendations.push(`Focus resources on ${topCategory[0]} threats, which represent the highest volume category.`);
  }
  
  recommendations.push('Maintain continuous monitoring and update threat intelligence databases.');
  recommendations.push('Coordinate with relevant law enforcement agencies for high-severity threats.');
  
  return recommendations;
};

const generateKeyFindings = (threatStats, threatCategories) => {
  const findings = [];
  
  const threatRate = threatStats.totalAnalyzed > 0 ? 
    (threatStats.threatsDetected / threatStats.totalAnalyzed * 100).toFixed(1) : 0;
  
  findings.push(`Threat detection rate of ${threatRate}% indicates ${threatRate > 20 ? 'high' : threatRate > 10 ? 'moderate' : 'low'} threat environment`);
  
  if (threatStats.highSeverity > 0) {
    findings.push(`${threatStats.highSeverity} high-severity incidents identified requiring priority attention`);
  }
  
  const topCategory = threatCategories.sort((a, b) => b.count - a.count)[0];
  if (topCategory && topCategory.count > 0) {
    findings.push(`${topCategory.category} represents the primary threat vector with ${topCategory.count} incidents`);
  }
  
  if (threatStats.averageConfidence > 80) {
    findings.push(`High confidence levels (${threatStats.averageConfidence}%) in threat classifications indicate reliable detection capability`);
  }
  
  return findings;
};

const generateImmediateActions = (threatStats, threatCategories, riskLevel) => {
  const actions = [];
  
  if (riskLevel === 'HIGH') {
    actions.push('Activate enhanced monitoring protocols');
    actions.push('Brief senior leadership on current threat landscape');
  }
  
  if (threatStats.highSeverity > 3) {
    actions.push('Conduct immediate review of all high-severity incidents');
    actions.push('Coordinate with field operations for potential threat mitigation');
  }
  
  const criticalCategories = threatCategories.filter(cat => cat.count > 5);
  if (criticalCategories.length > 0) {
    actions.push(`Deploy specialized resources for ${criticalCategories.map(c => c.category).join(', ')} threats`);
  }
  
  actions.push('Update threat indicators and warning systems');
  actions.push('Schedule follow-up assessment within 72 hours');
  
  return actions;
};

// Legacy helper functions for backward compatibility
const addReportHeader = (doc, pageWidth, userInfo, title = 'Threat Analysis Report') => {
  addLawEnforcementHeader(doc, pageWidth, {
    classification_level: 'OFFICIAL_USE_ONLY',
    report_type: title,
    report_id: `RPT-${Date.now().toString().slice(-8)}`,
    generation_date: new Date().toISOString(),
    analyst: userInfo.name || 'System User',
    analyst_email: userInfo.email || 'N/A'
  });
};

const addThreatOverview = (doc, historyData) => {
  // Legacy function - redirects to new implementation
  const reportData = {
    executive_summary: {
      total_items_analyzed: historyData.length,
      threats_detected: historyData.filter(item => item.result?.threat).length,
      threat_detection_rate: historyData.length > 0 ? 
        ((historyData.filter(item => item.result?.threat).length / historyData.length) * 100).toFixed(1) + '%' : '0%'
    },
    report_period: {
      start_date: historyData.length > 0 ? new Date(historyData[historyData.length - 1].timestamp).toLocaleDateString() : 'N/A',
      end_date: historyData.length > 0 ? new Date(historyData[0].timestamp).toLocaleDateString() : 'N/A'
    }
  };
  
  addExecutiveSummary(doc, reportData);
};

const addThreatDetailsTable = (doc, historyData) => {
  const threats = historyData.filter(item => item.result?.threat);
  const incidents = threats.map((item, index) => ({
    incident_id: `INC-${Date.now().toString().slice(-6)}-${index + 1}`,
    timestamp: new Date(item.timestamp).toLocaleString(),
    content: item.text || 'No content provided',
    classification: item.result?.predicted_class || 'Unknown',
    confidence: `${((item.result?.confidence || 0) * 100).toFixed(1)}%`,
    severity_level: getThreatSeverityFromResult(item.result?.predicted_class, item.result?.confidence),
    risk_assessment: 'REVIEW REQUIRED'
  }));
  
  addIncidentDetailsTable(doc, incidents);
};

const addStatisticsSummary = (doc, threatStats, threatCategories) => {
  const reportData = {
    threat_landscape_overview: {
      overall_risk_level: threatStats.highSeverity > 5 ? 'HIGH' : threatStats.highSeverity > 2 ? 'MEDIUM' : 'LOW',
      total_assessments_conducted: threatStats.totalAnalyzed,
      confirmed_threats: threatStats.threatsDetected,
      threat_detection_rate: threatStats.totalAnalyzed > 0 ? 
        `${((threatStats.threatsDetected / threatStats.totalAnalyzed) * 100).toFixed(1)}%` : '0%',
      high_severity_incidents: threatStats.highSeverity,
      trend_indicator: threatStats.recentChange > 0 ? 'INCREASING' : 
                      threatStats.recentChange < 0 ? 'DECREASING' : 'STABLE'
    },
    category_analysis: threatCategories.map(category => ({
      threat_type: category.category,
      incident_count: category.count,
      percentage_of_total: `${category.percentage}%`,
      trend: category.trend.toUpperCase(),
      risk_assessment: category.count > 10 ? 'HIGH VOLUME' : category.count > 5 ? 'MODERATE' : 'LOW VOLUME'
    }))
  };
  
  addThreatLandscapeOverview(doc, reportData);
  addCategoryAnalysisTable(doc, reportData.category_analysis);
}; 