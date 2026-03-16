import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnalysisReport } from '../types';
import { format } from 'date-fns';

export const generatePDF = (report: AnalysisReport) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Header Section
  doc.setFontSize(8);
  doc.text('Page 1 of 1', pageWidth / 2, 10, { align: 'center' });

  // Logo Section (Replacing with a placeholder for the provided logo)
  // In a real app, you'd use doc.addImage(base64Logo, 'PNG', margin, 15, 30, 30)
  doc.setFillColor(0, 102, 179); // Biocom Blue
  doc.rect(margin, 15, 25, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BIOCOM', margin + 2, 25);
  doc.text('LABS', margin + 2, 32);
  
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('US EPA LAB CODE: NY01602', margin, 45);

  // Company Info (Right Aligned)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  const rightAlignX = pageWidth - margin;
  doc.text('BIOCOM INC.', rightAlignX, 15, { align: 'right' });
  doc.text('Address: 28-07 Jackson Ave, 5th Floor', rightAlignX, 20, { align: 'right' });
  doc.text('Long Island City, NY 11101, USA', rightAlignX, 25, { align: 'right' });
  doc.text('Phone number: +1 (609) 592-1084', rightAlignX, 30, { align: 'right' });
  doc.text('Website: http://www.biocomlabs.com', rightAlignX, 35, { align: 'right' });
  doc.text('Email: office@BiocomLabs.com', rightAlignX, 40, { align: 'right' });

  // Report Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT OF ANALYSIS', pageWidth / 2, 55, { align: 'center' });
  // Removed the line below title as requested
  
  doc.setFontSize(8); // Smaller font for date
  doc.setFont('helvetica', 'normal');
  doc.text(`Report Date: ${format(new Date(), 'MMMM dd, yyyy')}`, rightAlignX, 63, { align: 'right' }); // Right aligned

  // Introductory Text
  doc.setFontSize(9);
  const introText = 'BIOCOM INC., US EPA LAB CODE: NY01602, has received the sample(s) for the analyses detailed in the accompanying report. The project referenced above has been thoroughly analyzed as per your instructions. The analytical data has undergone validation using standard quality control measures mandated by the analytical method.';
  const splitIntro = doc.splitTextToSize(introText, pageWidth - (margin * 2));
  doc.text(splitIntro, margin, 75);

  // Client Details Section (Two Columns)
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT DETAILS', margin, 95);
  doc.line(margin, 96, pageWidth - margin, 96);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Left Column
  let y = 102;
  doc.text(`Client: ${report.clientInfo.clientName}`, margin, y);
  doc.text(`Full Name: ${report.clientInfo.fullName}`, margin, y + 5);
  doc.text(`Address: ${report.clientInfo.address}`, margin, y + 10);
  doc.text(`State: ${report.clientInfo.state}`, margin, y + 15);
  doc.text(`Country: ${report.clientInfo.country}`, margin, y + 20);

  // Right Column
  const midX = pageWidth / 2 + 5;
  doc.text(`Salutation: ${report.clientInfo.salutation}`, midX, y);
  doc.text(`Phone Number: ${report.clientInfo.phoneNumber}`, midX, y + 5);
  doc.text(`City: ${report.clientInfo.city}`, midX, y + 10);
  doc.text(`Zip Code: ${report.clientInfo.zipCode}`, midX, y + 15);

  // Sample Information Table
  autoTable(doc, {
    startY: 130,
    head: [['Sample ID [External]', 'Sampling Date', 'Sampling Time', 'Project Name']],
    body: [[
      report.sampleInfo.sampleId,
      report.sampleInfo.samplingDate,
      report.sampleInfo.samplingTime,
      report.sampleInfo.projectName
    ]],
    headStyles: { fillColor: [220, 240, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    theme: 'grid',
    styles: { fontSize: 8 }
  });

  // Sample Details Table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 5,
    head: [['PO Number [External]', 'Sample Subtype', 'Sample Preparation Date', 'Sample Preparation Time']],
    body: [[
      report.sampleInfo.projectNumber,
      report.sampleInfo.sampleSubtype,
      report.sampleInfo.samplePreparationDate,
      report.sampleInfo.samplePreparationTime
    ]],
    headStyles: { fillColor: [220, 240, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    theme: 'grid',
    styles: { fontSize: 8 }
  });

  // Test Results Table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Test', 'Method', 'Result', 'Unit', 'RL']],
    body: report.testResults.map(tr => [tr.test, tr.method, tr.result, tr.unit, tr.rl]),
    headStyles: { fillColor: [220, 240, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    theme: 'grid',
    styles: { fontSize: 8 }
  });

  // Analysis Information Table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Analysis Date', 'Analysis Time', 'Analysis By', 'QC Reporting By']],
    body: [[
      report.analysisInfo.analysisDate,
      report.analysisInfo.analysisTime,
      report.analysisInfo.analysisBy,
      report.analysisInfo.qcReportingBy
    ]],
    headStyles: { fillColor: [220, 240, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    theme: 'grid',
    styles: { fontSize: 8 }
  });

  // Signature Section
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.line(margin, finalY, margin + 50, finalY);
  doc.setFontSize(9);
  doc.text('Reviewed and Authorized by', margin, finalY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text('Marubetsy Alcina', margin, finalY + 10);

  // Footer Section
  const footerText = "The data and information on this, and other accompanying documents, represents only the sample(s) analyzed. This report is incomplete unless all pages indicated in the footnote are present and an authorized signature is included. The services were provided under and subject to BIOCOM’s standard terms and conditions which can be located and reviewed at https://biocomlabs.com/terms-and-conditions. Permission from the laboratory and/or the relevant entity is required for full reproduction of this report. Results to be retained for 3 years.\nDefinitions: MPN/mL Most Probable Number per 1 Milliliters / EST: Estimated result / MPN/100mL Most Probable Number per 100 Milliliters / RL: Reporting Limit";
  
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const splitFooter = doc.splitTextToSize(footerText, pageWidth - (margin * 2));
    doc.text(splitFooter, margin, doc.internal.pageSize.getHeight() - 12);
  }

  return doc;
};
