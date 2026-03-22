'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TENANT_ID = 'test-shop';

interface Summary {
  total_orders: number;
  total_revenue: number;
  by_status: Record<string, number>;
  by_source: Record<string, number>;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  const { t, language } = useLanguage();

  useEffect(() => {
    fetchSummary();
  }, [period]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/dashboard/summary?tenant_id=${TENANT_ID}&period=${period}`);
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => language === 'th' ? `฿${value.toLocaleString()}` : `$${Math.round(value / 35).toLocaleString()}`;

  const STATUS_CONFIG: Record<string, { labelKey: string; icon: string; color: string; bg: string }> = {
    pending: { labelKey: 'status.pending', icon: '⏳', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    paid: { labelKey: 'status.paid', icon: '💳', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    packed: { labelKey: 'status.packed', icon: '📦', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    shipped: { labelKey: 'status.shipped', icon: '🚚', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    completed: { labelKey: 'status.completed', icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    cancelled: { labelKey: 'status.cancelled', icon: '❌', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
  };

  const SOURCE_CONFIG: Record<string, { labelKey: string; color: string; bg: string }> = {
    shopee: { labelKey: 'source.shopee', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    lazada: { labelKey: 'source.lazada', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    tiktok: { labelKey: 'source.tiktok', color: 'text-gray-800 dark:text-gray-200', bg: 'bg-gray-100 dark:bg-gray-800' },
    shopify: { labelKey: 'source.shopify', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    csv: { labelKey: 'source.csv', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  };

  return (
    <Layout currentPage="dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="input max-w-[180px]"
        >
          <option value="today">{t('period.today')}</option>
          <option value="week">{t('period.week')}</option>
          <option value="month">{t('period.month')}</option>
        </select>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-4 w-20 bg-gray-200 dark:bg-slate-700 rounded mb-3" />
              <div className="h-8 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : summary ? (
        <>
          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="stat-card card-hover">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('dashboard.total_orders')}</span>
                <span className="text-2xl">📦</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {summary.total_orders.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('dashboard.orders')}
              </p>
            </div>

            <div className="stat-card card-hover">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('dashboard.total_revenue')}</span>
                <span className="text-2xl">💰</span>
              </div>
              <p className="text-3xl font-bold text-emerald-600 mt-2">
                {formatCurrency(summary.total_revenue)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('dashboard.value')}
              </p>
            </div>

            <div className="stat-card card-hover">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('dashboard.pending')}</span>
                <span className="text-2xl">⏳</span>
              </div>
              <p className="text-3xl font-bold text-amber-600 mt-2">
                {summary.by_status.pending || 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('dashboard.orders')}
              </p>
            </div>

            <div className="stat-card card-hover">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('dashboard.to_ship')}</span>
                <span className="text-2xl">🚚</span>
              </div>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {(summary.by_status.paid || 0) + (summary.by_status.packed || 0)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('dashboard.orders')}
              </p>
            </div>
          </div>

          {/* Status & Source */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* By Status */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('dashboard.order_status')}
              </h2>
              <div className="space-y-3">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                  const count = summary.by_status[status] || 0;
                  const percentage = summary.total_orders > 0 ? (count / summary.total_orders * 100) : 0;
                  
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center`}>
                        <span>{config.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t(config.labelKey)}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {count}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${config.bg.replace('50', '400')} rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Source */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('dashboard.sales_channels')}
              </h2>
              <div className="space-y-3">
                {Object.entries(summary.by_source).length > 0 ? (
                  Object.entries(summary.by_source).map(([source, count]) => {
                    const config = SOURCE_CONFIG[source] || { labelKey: source, color: '', bg: 'bg-gray-50' };
                    const percentage = summary.total_orders > 0 ? (count / summary.total_orders * 100) : 0;
                    
                    return (
                      <div key={source} className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center`}>
                          <span className={`text-sm font-semibold ${config.color}`}>
                            {t(config.labelKey).charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {t(config.labelKey)}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {count}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    <p className="text-4xl mb-2">📊</p>
                    <p>{t('revenue.no_data')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p>{t('empty.no_data')}</p>
        </div>
      )}
    </Layout>
  );
}
