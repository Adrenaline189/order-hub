'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/context/LanguageContext';

interface ExportButtonProps {
  data: any;
  filename?: string;
}

export default function ExportButton({ data, filename = 'report' }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const { t, language } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      const wb = XLSX.utils.book_new();
      
      // Summary Sheet
      const summaryData = [
        [language === 'th' ? 'รายงานรายได้' : 'Revenue Report'],
        [''],
        [language === 'th' ? 'วันที่' : 'Date', new Date().toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')],
        [''],
        [language === 'th' ? 'สรุป' : 'Summary'],
        [language === 'th' ? 'รายได้รวม' : 'Total Revenue', data.summary.total_revenue],
        [language === 'th' ? 'จำนวนออเดอร์' : 'Total Orders', data.summary.total_orders],
        [language === 'th' ? 'เฉลี่ย/ออเดอร์' : 'Avg Order Value', data.summary.avg_order_value],
        [''],
        [language === 'th' ? 'รายได้ตามแพลตฟอร์ม' : 'Revenue by Platform'],
        ...data.by_source.map((s: any) => [s.source, s.revenue, s.orders]),
        [''],
        [language === 'th' ? 'รายได้ตามวัน' : 'Revenue by Day'],
        ...data.by_time.map((t: any) => [t.date, t.revenue, t.orders]),
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, language === 'th' ? 'สรุป' : 'Summary');

      // Status Breakdown Sheet
      if (data.by_source_status) {
        const statusHeader = [language === 'th' ? 'แพลตฟอร์ม' : 'Platform'];
        const statuses = [...new Set(Object.values(data.by_source_status).flatMap((src: any) => Object.keys(src)))];
        statusHeader.push(...statuses.map((s: string) => language === 'th' ? getStatusLabelTH(s) : getStatusLabelEN(s)));
        statusHeader.push(language === 'th' ? 'สำเร็จ%' : 'Success %');

        const statusData = [statusHeader];
        Object.entries(data.by_source_status).forEach(([source, statuses]: [string, any]) => {
          const row = [source];
          let totalOrders = 0;
          let successOrders = 0;
          statuses = statuses as Record<string, { orders: number; revenue: number }>;
          Object.entries(statuses).forEach(([status, info]: [string, any]) => {
            row.push(info.orders);
            totalOrders += info.orders;
            if (status === 'completed' || status === 'shipped') successOrders += info.orders;
          });
          row.push(totalOrders > 0 ? Math.round((successOrders / totalOrders) * 100) + '%' : '0%');
          statusData.push(row);
        });
        const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
        XLSX.utils.book_append_sheet(wb, statusSheet, language === 'th' ? 'สถานะ' : 'Status');
      }

      // Top Products Sheet
      if (data.top_products_by_source) {
        const productsData = [[
          language === 'th' ? 'แพลตฟอร์ม' : 'Platform',
          language === 'th' ? 'สินค้า' : 'Product',
          language === 'th' ? 'หมวดหมู่' : 'Category',
          language === 'th' ? 'รายได้' : 'Revenue',
          language === 'th' ? 'ออเดอร์' : 'Orders',
        ]];
        Object.entries(data.top_products_by_source).forEach(([source, products]: [string, any]) => {
          products.forEach((p: any) => {
            productsData.push([source, p.name, p.category, p.revenue, p.orders]);
          });
        });
        const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
        XLSX.utils.book_append_sheet(wb, productsSheet, language === 'th' ? 'สินค้าขายดี' : 'Top Products');
      }

      // Peak Analysis Sheet
      if (data.peak_analysis) {
        const peakData = [
          [language === 'th' ? 'วิเคราะห์ช่วงเวลา' : 'Peak Analysis'],
          [''],
          [language === 'th' ? 'วันขายดีที่สุด' : 'Best Day', data.peak_analysis.peak_day?.day || '-', data.peak_analysis.peak_day?.revenue || 0],
          [language === 'th' ? 'ชั่วโมงขายดีที่สุด' : 'Best Hour', data.peak_analysis.peak_hour?.label || '-', data.peak_analysis.peak_hour?.orders || 0],
          [''],
          [language === 'th' ? 'ยอดขายตามวัน' : 'Revenue by Day'],
          ...data.peak_analysis.by_day_of_week.map((d: any) => [d.day, d.orders, d.revenue]),
          [''],
          [language === 'th' ? 'ยอดขายตามชั่วโมง' : 'Revenue by Hour'],
          ...data.peak_analysis.by_hour.map((h: any) => [`${h.hour}:00`, h.orders, h.revenue]),
        ];
        const peakSheet = XLSX.utils.aoa_to_sheet(peakData);
        XLSX.utils.book_append_sheet(wb, peakSheet, language === 'th' ? 'ช่วงเวลา' : 'Peak Times');
      }

      const fileName = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const handleExportPDF = () => {
    setShowMenu(false);
    // Use browser print with PDF
    window.print();
  };

  const getStatusLabelTH = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'รอชำระ',
      paid: 'ชำระแล้ว',
      packed: 'แพ็คแล้ว',
      shipped: 'ส่งแล้ว',
      completed: 'สำเร็จ',
      cancelled: 'ยกเลิก',
    };
    return labels[status] || status;
  };

  const getStatusLabelEN = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      paid: 'Paid',
      packed: 'Packed',
      shipped: 'Shipped',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={loading || !data}
        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        {t('revenue.export') || 'Export'}
      </button>

      {showMenu && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg overflow-hidden w-48">
          <button
            onClick={handleExportExcel}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            <span className="text-lg">📊</span>
            {language === 'th' ? 'Export Excel' : 'Export to Excel'}
          </button>
          <button
            onClick={handleExportPDF}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition border-t border-gray-100 dark:border-slate-700"
          >
            <span className="text-lg">📄</span>
            {language === 'th' ? 'Print / PDF' : 'Print / Save as PDF'}
          </button>
        </div>
      )}
    </div>
  );
}
