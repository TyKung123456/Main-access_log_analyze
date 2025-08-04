// src/utils/securityReportGenerator.js - PDF Report Generator
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Register Thai font for PDF (you'll need to add this font file)
// For now, we'll use basic fonts and handle Thai text carefully

class SecurityReportGenerator {
  constructor() {
    this.doc = new jsPDF();
    this.pageHeight = this.doc.internal.pageSize.height;
    this.pageWidth = this.doc.internal.pageSize.width;
    this.margin = 20;
    this.currentY = this.margin;
  }

  // Main function to generate security analysis report
  generateSecurityReport(anomalies, stats, logData) {
    try {
      console.log('📄 Generating security report PDF...');
      
      // Reset document
      this.doc = new jsPDF();
      this.currentY = this.margin;

      // Add report content
      this.addHeader();
      this.addExecutiveSummary(anomalies, stats, logData);
      this.addAnomalySummary(anomalies);
      this.addDetailedAnalysis(anomalies);
      this.addRecommendations(anomalies);
      this.addFooter();

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `security-analysis-report-${timestamp}.pdf`;

      // Save PDF
      this.doc.save(filename);
      
      console.log('✅ Security report generated successfully');
      return { success: true, filename };
      
    } catch (error) {
      console.error('❌ Failed to generate security report:', error);
      throw new Error(`การสร้างรายงานล้มเหลว: ${error.message}`);
    }
  }

  // Add header with logo and title
  addHeader() {
    // Title
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Security Analysis Report', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 10;

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Access Control Security Assessment', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 15;

    // Date and time
    this.doc.setFontSize(10);
    const now = new Date();
    this.doc.text(`Generated: ${now.toLocaleString('en-US')}`, this.margin, this.currentY);
    this.doc.text(`Report ID: SEC-${now.getTime().toString().slice(-8)}`, this.pageWidth - this.margin - 60, this.currentY);
    this.currentY += 20;

    // Add line separator
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 15;
  }

  // Add executive summary
  addExecutiveSummary(anomalies, stats, logData) {
    this.checkPageSpace(80);
    
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Executive Summary', this.margin, this.currentY);
    this.currentY += 15;

    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');

    // Summary statistics
    const summaryData = [
      ['Total Records Analyzed', (logData?.length || 0).toLocaleString()],
      ['Total Anomalies Detected', (anomalies?.summary?.totalAnomalies || 0).toLocaleString()],
      ['High Risk Incidents', (anomalies?.summary?.highRisk || 0).toLocaleString()],
      ['Medium Risk Incidents', (anomalies?.summary?.mediumRisk || 0).toLocaleString()],
      ['Low Risk Incidents', (anomalies?.summary?.lowRisk || 0).toLocaleString()],
      ['Overall Risk Level', this.calculateOverallRisk(anomalies)]
    ];

    this.doc.autoTable({
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'striped',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [52, 73, 94] },
      margin: { left: this.margin, right: this.margin }
    });

    this.currentY = this.doc.lastAutoTable.finalY + 20;
  }

  // Add anomaly summary charts/tables
  addAnomalySummary(anomalies) {
    this.checkPageSpace(100);

    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Anomaly Categories Summary', this.margin, this.currentY);
    this.currentY += 15;

    if (!anomalies?.categories) {
      this.doc.setFontSize(11);
      this.doc.text('No anomalies detected in the current dataset.', this.margin, this.currentY);
      this.currentY += 20;
      return;
    }

    // Prepare category summary data
    const categoryData = Object.entries(anomalies.categories).map(([key, category]) => [
      this.getCategoryDisplayName(key),
      category.data.length.toString(),
      this.calculateCategoryRisk(category.data),
      category.description
    ]);

    this.doc.autoTable({
      startY: this.currentY,
      head: [['Category', 'Count', 'Risk Level', 'Description']],
      body: categoryData,
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [52, 73, 94] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 85 }
      },
      margin: { left: this.margin, right: this.margin }
    });

    this.currentY = this.doc.lastAutoTable.finalY + 20;
  }

  // Add detailed analysis for each category
  addDetailedAnalysis(anomalies) {
    this.checkPageSpace(60);

    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Detailed Analysis', this.margin, this.currentY);
    this.currentY += 15;

    if (!anomalies?.categories) return;

    Object.entries(anomalies.categories).forEach(([key, category]) => {
      if (category.data.length === 0) return;

      this.checkPageSpace(80);

      // Category title
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(this.getCategoryDisplayName(key), this.margin, this.currentY);
      this.currentY += 10;

      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(category.description, this.margin, this.currentY);
      this.currentY += 15;

      // Show top incidents for this category
      const topIncidents = category.data.slice(0, 10);
      const incidentData = topIncidents.map(incident => [
        incident.cardName || 'Unknown',
        incident.location || 'Unknown',
        this.formatDateTime(incident.accessTime),
        incident.riskLevel || 'Unknown',
        this.truncateText(incident.description || '', 40)
      ]);

      if (incidentData.length > 0) {
        this.doc.autoTable({
          startY: this.currentY,
          head: [['User', 'Location', 'Time', 'Risk', 'Description']],
          body: incidentData,
          theme: 'striped',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [52, 73, 94] },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 30 },
            2: { cellWidth: 35 },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 60 }
          },
          margin: { left: this.margin, right: this.margin }
        });

        this.currentY = this.doc.lastAutoTable.finalY + 15;

        if (category.data.length > 10) {
          this.doc.setFontSize(9);
          this.doc.setTextColor(100);
          this.doc.text(`... and ${category.data.length - 10} more incidents`, this.margin, this.currentY);
          this.doc.setTextColor(0);
          this.currentY += 15;
        }
      }
    });
  }

  // Add security recommendations
  addRecommendations(anomalies) {
    this.checkPageSpace(100);

    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Security Recommendations', this.margin, this.currentY);
    this.currentY += 15;

    const recommendations = this.generateRecommendations(anomalies);

    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');

    recommendations.forEach((rec, index) => {
      this.checkPageSpace(30);
      
      // Priority indicator
      const priorityColor = rec.priority === 'High' ? [231, 76, 60] : 
                           rec.priority === 'Medium' ? [241, 196, 15] : [46, 204, 113];
      
      this.doc.setFillColor(...priorityColor);
      this.doc.circle(this.margin + 3, this.currentY - 2, 2, 'F');
      
      this.doc.setTextColor(0);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`${index + 1}. ${rec.title}`, this.margin + 10, this.currentY);
      this.currentY += 8;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(10);
      
      const descLines = this.doc.splitTextToSize(rec.description, this.pageWidth - 2 * this.margin - 10);
      this.doc.text(descLines, this.margin + 10, this.currentY);
      this.currentY += descLines.length * 5 + 10;
    });
  }

  // Add footer
  addFooter() {
    const footerY = this.pageHeight - 20;
    
    this.doc.setFontSize(8);
    this.doc.setTextColor(100);
    this.doc.text('Confidential - Security Analysis Report', this.margin, footerY);
    this.doc.text(`Page ${this.doc.getCurrentPageInfo().pageNumber}`, this.pageWidth - this.margin - 15, footerY);
    
    // Add line above footer
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, footerY - 5, this.pageWidth - this.margin, footerY - 5);
  }

  // Utility functions
  checkPageSpace(requiredSpace) {
    if (this.currentY + requiredSpace > this.pageHeight - 40) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  calculateOverallRisk(anomalies) {
    if (!anomalies?.summary) return 'Unknown';
    
    const { highRisk, mediumRisk, lowRisk } = anomalies.summary;
    const total = highRisk + mediumRisk + lowRisk;
    
    if (total === 0) return 'No Risk';
    
    const highPercentage = (highRisk / total) * 100;
    const mediumPercentage = (mediumRisk / total) * 100;
    
    if (highPercentage > 20) return 'High Risk';
    if (highPercentage > 10 || mediumPercentage > 40) return 'Medium Risk';
    return 'Low Risk';
  }

  calculateCategoryRisk(data) {
    if (!data.length) return 'None';
    
    const highCount = data.filter(item => item.riskLevel === 'high').length;
    const mediumCount = data.filter(item => item.riskLevel === 'medium').length;
    
    const highPercentage = (highCount / data.length) * 100;
    const mediumPercentage = (mediumCount / data.length) * 100;
    
    if (highPercentage > 30) return 'High';
    if (highPercentage > 10 || mediumPercentage > 50) return 'Medium';
    return 'Low';
  }

  getCategoryDisplayName(key) {
    const names = {
      accessDenied: 'Access Denied',
      unusualTimeAccess: 'Unusual Time Access',
      multipleFailures: 'Multiple Failures',
      locationAnomalies: 'Location Anomalies',
      multipleFailedAttempts: 'Multiple Failed Attempts',
      suspiciousCardUsage: 'Suspicious Card Usage',
      frequencyAnomalies: 'Frequency Anomalies'
    };
    return names[key] || key;
  }

  generateRecommendations(anomalies) {
    const recommendations = [];
    
    if (!anomalies?.summary) return recommendations;

    // High-level recommendations based on anomaly patterns
    if (anomalies.summary.highRisk > 0) {
      recommendations.push({
        priority: 'High',
        title: 'Immediate Security Review Required',
        description: `${anomalies.summary.highRisk} high-risk security incidents detected. Conduct immediate investigation and implement emergency security measures.`
      });
    }

    if (anomalies.categories?.accessDenied?.data.length > 10) {
      recommendations.push({
        priority: 'Medium',
        title: 'Review Access Control Policies',
        description: 'High number of access denied incidents detected. Review and update access control policies and user permissions.'
      });
    }

    if (anomalies.categories?.unusualTimeAccess?.data.length > 0) {
      recommendations.push({
        priority: 'Medium',
        title: 'Implement Time-Based Access Controls',
        description: 'Unusual time access patterns detected. Consider implementing stricter time-based access controls and monitoring.'
      });
    }

    if (anomalies.categories?.multipleFailures?.data.length > 0) {
      recommendations.push({
        priority: 'High',
        title: 'Enhance Failed Attempt Monitoring',
        description: 'Multiple failed access attempts detected. Implement automated lockout mechanisms and real-time alert systems.'
      });
    }

    // Default recommendations if no specific patterns found
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'Low',
        title: 'Continue Monitoring',
        description: 'Security analysis shows normal patterns. Continue regular monitoring and periodic security assessments.'
      });
    }

    return recommendations;
  }

  formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return 'Unknown';
    try {
      return new Date(dateTimeStr).toLocaleString('en-US', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  }

  truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}

// Export singleton instance
export const securityReportGenerator = new SecurityReportGenerator();
export default securityReportGenerator;