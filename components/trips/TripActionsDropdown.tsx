'use client';

import { useState } from 'react';

import { Activity, Trip } from '@prisma/client';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DownloadCloud, MoreVertical, Printer, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TripActionsDropdownProps {
  trip: Trip & {
    activities: Activity[];
  };
}

function groupActivitiesByDate(activities: Activity[]) {
  const grouped = new Map<string, Activity[]>();

  activities.forEach(activity => {
    const date = format(new Date(activity.startTime), 'yyyy-MM-dd');
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(activity);
  });

  grouped.forEach(activities => {
    activities.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  });

  return grouped;
}

export function TripActionsDropdown({ trip }: TripActionsDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handlePrint = () => {
    window.open(`/trips/${trip.id}/print`, '_blank');
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '800px';

      const groupedActivities = groupActivitiesByDate(trip.activities);

      container.innerHTML = `
        <div id="pdf-content" style="
          padding: 20mm;
          padding-bottom: 30mm;
          font-family: Arial, sans-serif;
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          position: relative;
        ">
          <!-- Header with Logo -->
          <div style="
            text-align: left;
            margin-bottom: 40px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          ">
            <div style="
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              letter-spacing: -0.5px;
            ">
              HereThere
            </div>
          </div>

          <!-- Title Section -->
          <div style="
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
          ">
            <h1 style="font-size: 28px; margin-bottom: 12px; color: #333;">${trip.title}</h1>
            <p style="color: #666; margin-bottom: 8px; font-size: 16px;">${trip.destination}</p>
            <p style="color: #666; font-size: 16px;">
              ${format(new Date(trip.startDate), 'MMMM d')} - 
              ${format(new Date(trip.endDate), 'MMMM d, yyyy')}
            </p>
          </div>

          <div style="margin: 0 auto;">
            ${Array.from(groupedActivities.entries())
              .map(
                ([date, activities]) => `
              <div style="margin-bottom: 32px; page-break-inside: avoid;">
                <h2 style="
                  font-size: 20px;
                  padding-bottom: 8px;
                  border-bottom: 1px solid #eee;
                  margin-bottom: 16px;
                  color: #333;
                ">
                  ${format(new Date(date), 'EEEE, MMMM d')}
                </h2>
                <div style="margin-left: 16px;">
                  ${activities
                    .map(
                      activity => `
                    <div style="
                      margin-bottom: 24px;
                      padding: 16px;
                      border: 1px solid #eee;
                      border-radius: 8px;
                    ">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                          <h3 style="font-size: 18px; margin-bottom: 8px; color: #333;">
                            ${activity.name}
                          </h3>
                          <p style="color: #666; font-size: 14px; margin-bottom: 4px;">
                            ${format(new Date(activity.startTime), 'h:mm a')} - 
                            ${format(new Date(activity.endTime), 'h:mm a')}
                          </p>
                          <p style="color: #666; font-size: 14px; margin-bottom: 4px;">
                            ${activity.address}
                          </p>
                          ${
                            activity.notes
                              ? `
                            <p style="
                              color: #666;
                              font-size: 14px;
                              margin-top: 8px;
                              font-style: italic;
                            ">
                              ${activity.notes}
                            </p>
                          `
                              : ''
                          }
                        </div>
                        <div style="
                          color: #666;
                          font-size: 14px;
                          background: #f5f5f5;
                          padding: 4px 12px;
                          border-radius: 4px;
                          margin-left: 16px;
                        ">
                          ${activity.category}
                        </div>
                      </div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
              )
              .join('')}
          </div>

          <!-- Footer -->
          <div style="
            position: fixed;
            bottom: 20mm;
            left: 20mm;
            right: 20mm;
            padding-top: 10px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: #666;
          ">
            <div>
              Generated by HereThere on ${format(new Date(), 'MMMM d, yyyy')}
            </div>
            <div>
              HereThere.com
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      const content = document.getElementById('pdf-content')!;
      const canvas = await html2canvas(content, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Add first page
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Add page numbers and additional pages if needed
      let heightLeft = imgHeight;
      let position = 0;
      let pageNumber = 1;

      pdf.setFontSize(10);
      pdf.setTextColor(102, 102, 102);
      pdf.text(
        `Page ${pageNumber}`,
        pdf.internal.pageSize.width / 2,
        pdf.internal.pageSize.height - 10,
        { align: 'center' }
      );

      while (heightLeft >= pageHeight) {
        position = heightLeft - pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
        pageNumber++;
        pdf.text(
          `Page ${pageNumber}`,
          pdf.internal.pageSize.width / 2,
          pdf.internal.pageSize.height - 10,
          { align: 'center' }
        );
        heightLeft -= pageHeight;
      }

      pdf.save(`${trip.title.toLowerCase().replace(/\s+/g, '-')}-itinerary.pdf`);
      document.body.removeChild(container);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Itinerary
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DownloadCloud className="mr-2 h-4 w-4" />
          )}
          {isExporting ? 'Exporting PDF...' : 'Export to PDF'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
