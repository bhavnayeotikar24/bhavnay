import { AuditLog } from '../types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportLogsToCSV = (logs: AuditLog[]) => {
  const headers = ['Timestamp', 'User Name', 'Role', 'Action', 'Module', 'Details'];
  
  const csvContent = [
    headers.join(','),
    ...logs.map(log => [
      `"${log.timestamp ? (typeof log.timestamp.toDate === 'function' ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')) : format(new Date(), 'yyyy-MM-dd HH:mm:ss')}"`,
      `"${log.userDisplayName}"`,
      `"${log.userRole}"`,
      `"${log.action}"`,
      `"${log.module}"`,
      `"${log.details?.replace(/"/g, '""') || ''}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `BIOCOM_AuditLog_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportLogsToPDF = (logs: AuditLog[]) => {
  const doc = new jsPDF('l', 'pt', 'a4');
  const margin = 40;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text('BIOCOM - Audit Trail Report', margin, 50);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, margin, 70);
  doc.text('21 CFR Part 11 Compliant Secure Log', margin, 85);

  const tableData = logs.map(log => [
    log.timestamp ? (typeof log.timestamp.toDate === 'function' ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')) : format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    `${log.userDisplayName} (${log.userRole})`,
    log.action,
    log.module,
    log.details || ''
  ]);

  autoTable(doc, {
    startY: 105,
    head: [['Timestamp', 'User / Role', 'Action', 'Module', 'Details']],
    body: tableData,
    margin: { left: margin, right: margin },
    headStyles: { 
      fillColor: [79, 70, 229], // Indigo 600
      fontSize: 9,
      fontStyle: 'bold'
    },
    styles: { 
      fontSize: 8,
      cellPadding: 8
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 120 },
      2: { cellWidth: 100 },
      3: { cellWidth: 80 },
      4: { cellWidth: 'auto' }
    }
  });

  doc.save(`BIOCOM_AuditLog_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
};
