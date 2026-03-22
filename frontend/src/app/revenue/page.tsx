'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';
import DateRangePicker from '@/components/DateRangePicker';
import ExportButton from '@/components/ExportButton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TENANT_ID = 'test-shop';

interface ComparisonData {
  current: { revenue: number; orders: number; avg_order_value: number };
  previous: { revenue: number; orders: number; avg_order_value: number };
  change: { revenue: number; orders: number; avg_order_value: number };
}

interface RevenueData {
  period: string;
  date_range: { from: string; to: string };
  summary: { total_revenue: number; total_orders: number; avg_order_value: number };
  by_source: Array<{ source: string; revenue: number; orders: number }>;
  by_time: Array<{ date: string; revenue: number; orders: number }>;
  available_sources: string[];
  by_source_status: Record<string, Record<string, { orders: number; revenue: number }>>;
  top_products_by_source: Record<string, Array<{ name: string; category: string; revenue: number; orders: number; share: number }>>;
  peak_analysis: {
    by_day_of_week: Array<{ day: string; day_idx: number; orders: number; revenue: number }>;
    by_hour: Array<{ hour: number; orders: number; revenue: number }>;
    peak_day: { day: string; day_idx: number; orders: number; revenue: number } | null;
    peak_hour: { hour: number; orders: number; revenue: number; label: string } | null;
    heatmap: Array<Record<string, any>>;
  };
}

const SOURCE_CONFIG: Record<string, { labelKey: string; color: string; bg: string; bar: string }> = {
  shopee: { labelKey: 'source.shopee', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', bar: 'bg-gradient-to-r from-orange-400 to-orange-500' },
  lazada: { labelKey: 'source.lazada', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', bar: 'bg-gradient-to-r from-blue-400 to-blue-500' },
  tiktok: { labelKey: 'source.tiktok', color: 'text-gray-800 dark:text-gray-200', bg: 'bg-gray-100 dark:bg-gray-800', bar: 'bg-gradient-to-r from-gray-400 to-gray-500' },
  shopify: { labelKey: 'source.shopify', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', bar: 'bg-gradient-to-r from-emerald-400 to-emerald-500' },
};

const STATUS_CONFIG: Record<string, { labelKey: string; bg: string; text: string }> = {
  pending: { labelKey: 'status.pending', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  paid: { labelKey: 'status.paid', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  packed: { labelKey: 'status.packed', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  shipped: { labelKey: 'status.shipped', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
  completed: { labelKey: 'status.completed', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  cancelled: { labelKey: 'status.cancelled', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
};

function ChangeIndicator({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;
  
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-medium ${
      isPositive ? 'text-emerald-600' : isNegative ? 'text-red-500' : 'text-gray-400'
    }`}>
      {isPositive && '↑'}
      {isNegative && '↓'}
      {isNeutral ? '–' : `${Math.abs(value)}${suffix}`}
    </span>
  );
}

function ComparisonCard({ 
  label, 
  current, 
  previous, 
  change, 
  format,
  icon
}: { 
  label: string; 
  current: number; 
  previous: number; 
  change: number; 
  format: (v: number) => string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        {icon}
      </div>
      <div className="flex items-baseline gap-3">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{format(current)}</p>
        <ChangeIndicator value={change} />
      </div>
      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
        <span>{format(previous)}</span>
        <span>→</span>
        <span>{format(current)}</span>
      </div>
    </div>
  );
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSource, setActiveSource] = useState('all');
  const [showStatusBreakdown, setShowStatusBreakdown] = useState(false);
  const [showTopProducts, setShowTopProducts] = useState(false);
  const [showPeakAnalysis, setShowPeakAnalysis] = useState(false);
  const [selectedSourceForProducts, setSelectedSourceForProducts] = useState<string | null>(null);
  const { t, language } = useLanguage();
  
  // Default to last 30 days
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
  });

  useEffect(() => {
    fetchData();
  }, [dateRange, activeSource]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        tenant_id: TENANT_ID,
        from_date: dateRange.from,
        to_date: dateRange.to,
      });
      if (activeSource !== 'all') params.append('source', activeSource);
      
      const [revenueRes, compareRes] = await Promise.all([
        fetch(`${API_URL}/revenue?${params}`),
        fetch(`${API_URL}/revenue/compare?tenant_id=${TENANT_ID}&period=month`),
      ]);
      
      const revenueData = await revenueRes.json();
      const compareData = await compareRes.json();
      
      setData(revenueData);
      setComparison(compareData);
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => language === 'th' ? `฿${value.toLocaleString()}` : `$${Math.round(value / 35).toLocaleString()}`;
  const maxRevenue = data?.by_time?.reduce((max, d) => Math.max(max, d.revenue), 1) || 1;

  // Get all unique statuses
  const allStatuses = [...new Set(
    Object.values(data?.by_source_status || {})
      .flatMap(src => Object.keys(src))
  )];

  // Calculate success rate per source
  const getSuccessRate = (sourceKey: string) => {
    const sourceData = data?.by_source_status?.[sourceKey] || {};
    const total = Object.values(sourceData).reduce((sum, s) => sum + s.orders, 0);
    const completed = sourceData.completed?.orders || 0;
    const shipped = sourceData.shipped?.orders || 0;
    const successOrders = completed + shipped;
    return total > 0 ? ((successOrders / total) * 100).toFixed(0) : '0';
  };

  return (
    <Layout currentPage="revenue">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('revenue.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('revenue.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStatusBreakdown(!showStatusBreakdown)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              showStatusBreakdown 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {language === 'th' ? 'สถานะ' : 'Status'}
            </span>
          </button>
          <button
            onClick={() => setShowTopProducts(!showTopProducts)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              showTopProducts 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {language === 'th' ? 'สินค้าขายดี' : 'Top Products'}
            </span>
          </button>
          <button
            onClick={() => setShowPeakAnalysis(!showPeakAnalysis)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              showPeakAnalysis 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {language === 'th' ? 'ช่วงเวลาขายดี' : 'Peak Times'}
            </span>
          </button>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          {data && <ExportButton data={data} filename="revenue-report" />}
        </div>
      </div>

      {/* Source Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button onClick={() => setActiveSource('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeSource === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'}`}>
          {t('revenue.all')}
        </button>
        {data?.available_sources?.map((source) => {
          const config = SOURCE_CONFIG[source] || { labelKey: source, bg: 'bg-gray-100 dark:bg-slate-700' };
          return (
            <button key={source} onClick={() => setActiveSource(source)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeSource === source ? 'bg-blue-500 text-white' : `${config.bg} text-gray-600 dark:text-gray-300`}`}>
              {t(config.labelKey)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32" />)}
        </div>
      ) : data ? (
        <>
          {/* Status Breakdown by Platform */}
          {showStatusBreakdown && data.by_source_status && (
            <div className="mb-8 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {language === 'th' ? 'สถานะออเดอร์ตามแพลตฟอร์ม' : 'Order Status by Platform'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'th' 
                    ? 'คลิกที่แถบเพื่อดูรายละเอียด' 
                    : 'Click on a platform to see details'}
                </p>
              </div>
              
              {/* Header Row */}
              <div className="grid gap-4 p-4 bg-gray-50 dark:bg-slate-900/50" style={{ gridTemplateColumns: '120px repeat(6, 1fr) 80px' }}>
                <div className="text-xs font-medium text-gray-500 uppercase">
                  {language === 'th' ? 'แพลตฟอร์ม' : 'Platform'}
                </div>
                {allStatuses.map(status => {
                  const config = STATUS_CONFIG[status] || { labelKey: status, bg: 'bg-gray-100', text: 'text-gray-700' };
                  return (
                    <div key={status} className="text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                        {t(config.labelKey)}
                      </span>
                    </div>
                  );
                })}
                <div className="text-xs font-medium text-gray-500 uppercase text-center">
                  {language === 'th' ? 'สำเร็จ' : 'Success'}
                </div>
              </div>

              {/* Data Rows */}
              {Object.entries(data.by_source_status).map(([source, statuses]) => {
                const config = SOURCE_CONFIG[source] || { labelKey: source, bg: 'bg-gray-100' };
                const totalOrders = Object.values(statuses).reduce((sum, s) => sum + s.orders, 0);
                
                return (
                  <div key={source} className="grid gap-4 p-4 border-t border-gray-100 dark:border-slate-700 items-center hover:bg-gray-50 dark:hover:bg-slate-700/30 transition" style={{ gridTemplateColumns: '120px repeat(6, 1fr) 80px' }}>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${config.bg}`}>{t(config.labelKey)}</span>
                      <span className="text-sm text-gray-500">({totalOrders})</span>
                    </div>
                    {allStatuses.map(status => {
                      const statusData = statuses[status];
                      return (
                        <div key={status} className="text-center">
                          {statusData ? (
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {statusData.orders}
                              </span>
                              <div className="text-xs text-gray-400">
                                {formatCurrency(statusData.revenue)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">–</span>
                          )}
                        </div>
                      );
                    })}
                    <div className="text-center">
                      <span className="text-sm font-semibold text-emerald-600">
                        {getSuccessRate(source)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Top Products by Platform */}
          {showTopProducts && data.top_products_by_source && (
            <div className="mb-8 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {language === 'th' ? 'สินค้าขายดีตามแพลตฟอร์ม' : 'Top Products by Platform'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'th' ? 'คลิกที่แพลตฟอร์มเพื่อดูสินค้าขายดี' : 'Click on a platform to see top products'}
                </p>
              </div>
              
              {/* Platform Tabs */}
              <div className="flex gap-2 p-4 border-b border-gray-100 dark:border-slate-700 overflow-x-auto">
                {data.available_sources.map(source => {
                  const config = SOURCE_CONFIG[source] || { labelKey: source, bg: 'bg-gray-100' };
                  const isSelected = selectedSourceForProducts === source || (!selectedSourceForProducts && source === data.available_sources[0]);
                  return (
                    <button
                      key={source}
                      onClick={() => setSelectedSourceForProducts(source)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                        isSelected ? 'bg-blue-500 text-white' : `${config.bg} text-gray-600 dark:text-gray-300`
                      }`}
                    >
                      {t(config.labelKey)}
                    </button>
                  );
                })}
              </div>
              
              {/* Products List */}
              <div className="p-4">
                {(() => {
                  const activeSource = selectedSourceForProducts || data.available_sources[0];
                  const products = data.top_products_by_source[activeSource] || [];
                  const sourceConfig = SOURCE_CONFIG[activeSource] || { labelKey: activeSource, bar: 'bg-blue-500' };
                  
                  return (
                    <div className="space-y-3">
                      {products.map((product, idx) => (
                        <div key={product.name} className="flex items-center gap-4">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-amber-400 text-amber-900' :
                            idx === 1 ? 'bg-gray-300 text-gray-700' :
                            idx === 2 ? 'bg-orange-300 text-orange-900' :
                            'bg-gray-100 dark:bg-slate-700 text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500">{product.category}</span>
                            </div>
                            <div className="mt-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${sourceConfig.bar || 'bg-blue-500'} rounded-full transition-all`}
                                style={{ width: `${product.share}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(product.revenue)}</span>
                            <span className="text-xs text-gray-400 ml-2">{product.orders} {language === 'th' ? 'ออเดอร์' : 'orders'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Peak Analysis */}
          {showPeakAnalysis && data.peak_analysis && (
            <div className="mb-8 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {language === 'th' ? 'วิเคราะห์ช่วงเวลาขายดี' : 'Peak Sales Analysis'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'th' 
                    ? 'วันและช่วงเวลาที่มียอดขายสูงสุด' 
                    : 'Best performing days and hours'}
                </p>
              </div>
              
              {/* Peak Day & Hour Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-500">{language === 'th' ? 'วันขายดีที่สุด' : 'Best Day'}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {data.peak_analysis.peak_day?.day || '-'}
                  </p>
                  <p className="text-sm text-emerald-600 mt-1">
                    {formatCurrency(data.peak_analysis.peak_day?.revenue || 0)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-500">{language === 'th' ? 'ชั่วโมงขายดีที่สุด' : 'Best Hour'}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {data.peak_analysis.peak_hour?.label || '-'}
                  </p>
                  <p className="text-sm text-emerald-600 mt-1">
                    {data.peak_analysis.peak_hour?.orders || 0} {language === 'th' ? 'ออเดอร์' : 'orders'}
                  </p>
                </div>
              </div>
              
              {/* Day of Week Chart */}
              <div className="p-4 border-t border-gray-100 dark:border-slate-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">
                  {language === 'th' ? 'ยอดขายตามวันในสัปดาห์' : 'Revenue by Day of Week'}
                </h4>
                <div className="flex items-end justify-between gap-2 h-32">
                  {data.peak_analysis.by_day_of_week.map((day) => {
                    const maxRev = Math.max(...data.peak_analysis.by_day_of_week.map(d => d.revenue), 1);
                    const pct = (day.revenue / maxRev) * 100;
                    const isPeak = day.day === data.peak_analysis.peak_day?.day;
                    return (
                      <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col items-center justify-end h-24">
                          <span className="text-xs text-gray-500 mb-1">{formatCurrency(day.revenue)}</span>
                          <div 
                            className={`w-full rounded-t transition-all ${isPeak ? 'bg-gradient-to-t from-amber-400 to-amber-500' : 'bg-gradient-to-t from-blue-400 to-blue-500'}`}
                            style={{ height: `${pct}%`, minHeight: day.revenue > 0 ? '4px' : '0' }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${isPeak ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'}`}>
                          {day.day.slice(0, 3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Hour Chart */}
              <div className="p-4 border-t border-gray-100 dark:border-slate-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">
                  {language === 'th' ? 'ยอดขายตามชั่วโมง' : 'Revenue by Hour'}
                </h4>
                <div className="flex items-end justify-between gap-1 h-24">
                  {data.peak_analysis.by_hour.map((hour) => {
                    const maxRev = Math.max(...data.peak_analysis.by_hour.map(h => h.revenue), 1);
                    const pct = (hour.revenue / maxRev) * 100;
                    const isPeak = hour.hour === data.peak_analysis.peak_hour?.hour;
                    return (
                      <div key={hour.hour} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-400">{hour.orders}</span>
                        <div 
                          className={`w-full rounded-t transition-all ${isPeak ? 'bg-gradient-to-t from-emerald-400 to-emerald-500' : 'bg-gradient-to-t from-indigo-400 to-indigo-500'}`}
                          style={{ height: `${pct}%`, minHeight: hour.revenue > 0 ? '4px' : '0' }}
                        />
                        <span className={`text-xs ${isPeak ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-400'}`}>
                          {String(hour.hour).padStart(2, '0')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Comparison Summary */}
          {comparison && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {language === 'th' ? 'เปรียบเทียบกับงวดก่อน' : 'Compared to previous period'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <ComparisonCard
                  label={t('revenue.total_revenue')}
                  current={comparison.current.revenue}
                  previous={comparison.previous.revenue}
                  change={comparison.change.revenue}
                  format={formatCurrency}
                  icon={<svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <ComparisonCard
                  label={t('revenue.orders')}
                  current={comparison.current.orders}
                  previous={comparison.previous.orders}
                  change={comparison.change.orders}
                  format={(v) => v.toLocaleString()}
                  icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
                />
                <ComparisonCard
                  label={t('revenue.avg_order')}
                  current={comparison.current.avg_order_value}
                  previous={comparison.previous.avg_order_value}
                  change={comparison.change.avg_order_value}
                  format={formatCurrency}
                  icon={<svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                />
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="stat-card relative overflow-hidden">
              {comparison && (
                <div className="absolute top-3 right-3">
                  <ChangeIndicator value={comparison.change.revenue} />
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('revenue.total_revenue')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(data.summary.total_revenue)}</p>
              {comparison && comparison.previous.revenue > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {language === 'th' ? 'จาก' : 'from'} {formatCurrency(comparison.previous.revenue)}
                </p>
              )}
            </div>
            <div className="stat-card relative overflow-hidden">
              {comparison && (
                <div className="absolute top-3 right-3">
                  <ChangeIndicator value={comparison.change.orders} />
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('revenue.orders')}</p>
              <p className="text-3xl font-bold text-blue-600">{data.summary.total_orders}</p>
              {comparison && comparison.previous.orders > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {language === 'th' ? 'จาก' : 'from'} {comparison.previous.orders.toLocaleString()}
                </p>
              )}
            </div>
            <div className="stat-card relative overflow-hidden">
              {comparison && (
                <div className="absolute top-3 right-3">
                  <ChangeIndicator value={comparison.change.avg_order_value} />
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('revenue.avg_order')}</p>
              <p className="text-3xl font-bold text-emerald-600">{formatCurrency(data.summary.avg_order_value)}</p>
              {comparison && comparison.previous.avg_order_value > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {language === 'th' ? 'จาก' : 'from'} {formatCurrency(comparison.previous.avg_order_value)}
                </p>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Revenue Over Time */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('revenue.trend')}</h2>
              <div className="space-y-2">
                {data.by_time.slice(-14).map((item) => (
                  <div key={item.date} className="flex items-center gap-3">
                    <span className="w-16 text-xs text-gray-400 truncate">{item.date}</span>
                    <div className="flex-1 h-5 bg-gray-100 dark:bg-slate-700 rounded overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded transition-all" style={{ width: `${(item.revenue / maxRevenue) * 100}%` }} />
                    </div>
                    <span className="w-20 text-sm text-right text-gray-600 dark:text-gray-300">{formatCurrency(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Source */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('revenue.by_source')}</h2>
              <div className="space-y-3">
                {data.by_source.length > 0 ? data.by_source.map((item) => {
                  const config = SOURCE_CONFIG[item.source] || { labelKey: item.source, bg: 'bg-gray-100', bar: 'bg-gray-400' };
                  const pct = data.summary.total_revenue > 0 ? (item.revenue / data.summary.total_revenue * 100) : 0;
                  return (
                    <div key={item.source} className="flex items-center gap-3">
                      <span className={`badge ${config.bg}`}>{t(config.labelKey)}</span>
                      <div className="flex-1 h-4 bg-gray-100 dark:bg-slate-700 rounded overflow-hidden">
                        <div className={`h-full ${config.bar} rounded`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 text-right">{formatCurrency(item.revenue)}</span>
                      <span className="text-xs text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  );
                }) : (
                  <p className="text-gray-400 text-center py-8">{t('revenue.no_data')}</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">{t('empty.no_data')}</div>
      )}
    </Layout>
  );
}
