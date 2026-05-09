import * as XLSX from 'xlsx';
import { AnalysisReport } from '../types';
import { format } from 'date-fns';

export const exportToExcel = (reports: AnalysisReport[]) => {
  try {
    if (!reports || reports.length === 0) {
      alert('No records available to export.');
      return;
    }

    const data = reports.map(report => {
      // Flatten the report structure for Excel
      const flatReport: any = {
        'Report ID': report.reportId,
        'Report Type': report.reportType,
        'Created At': report.createdAt ? (typeof report.createdAt.toDate === 'function' ? format(report.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm:ss')) : 'N/A',
        'Created By': report.createdBy,
        
        // Client Info
        'Client Name': report.clientInfo.clientName,
        'Client Full Name': report.clientInfo.fullName,
        'Client Phone': report.clientInfo.phoneNumber,
        'Client Address': report.clientInfo.address,
        'Client City': report.clientInfo.city,
        'Client State': report.clientInfo.state,
        'Zip Code': report.clientInfo.zipCode,
        'Client Country': report.clientInfo.country,
        
        // Sample Info
        'Project Name': report.sampleInfo.projectName,
        'Project Number': report.sampleInfo.projectNumber,
        'Sample ID': report.sampleInfo.sampleId,
        'Sample Subtype': report.sampleInfo.sampleSubtype,
        'Sampling Date': report.sampleInfo.samplingDate,
        'Sampling Time': report.sampleInfo.samplingTime,
        'Prep Date': report.sampleInfo.samplePreparationDate,
        'Prep Time': report.sampleInfo.samplePreparationTime,
        
        // Analysis Info
        'Analysis Date': report.analysisInfo.analysisDate,
        'Analysis Time': report.analysisInfo.analysisTime,
        'Analysis By': report.analysisInfo.analysisBy,
        'QC Reporting By': report.analysisInfo.qcReportingBy,
      };

      // Add test results
      report.testResults.forEach((tr, index) => {
        flatReport[`Test ${index + 1}`] = tr.test;
        flatReport[`Method ${index + 1}`] = tr.method;
        flatReport[`Result ${index + 1}`] = tr.result;
        flatReport[`Unit ${index + 1}`] = tr.unit;
        flatReport[`RL ${index + 1}`] = tr.rl;
      });

      return flatReport;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');

    // Trigger download
    XLSX.writeFile(workbook, `BIOCOM_Reports_Export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
  } catch (error) {
    console.error('Excel Export Error:', error);
    alert('Failed to export to Excel. Please check console for details.');
  }
};
