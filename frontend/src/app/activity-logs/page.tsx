'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TENANT_ID = 'test-shop';

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { labelKey: string; icon: string; color: string }> = {
  created: { labelKey: 'activity.created', icon: '✨', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
  status_change: { labelKey: 'activity.status_change', icon: '🔄', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
  note_add: { labelKey: 'activity.note_add', icon: '📝', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
  note_delete: { labelKey: 'activity.note_delete', icon: '🗑️', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
  sync: { labelKey: 'activity.sync', icon: '🔄', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
  sync_error: { labelKey: 'activity.sync_error', icon: '❌', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
  export: { labelKey: 'activity.export', icon: '📥', color: 'text-gray-600 bg-gray-100 dark:bg-gray-800' },
  bulk_update: { labelKey: 'activity.bulk_update', icon: '📦', color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' },
};

const ENTITY_LABELS: Record<string, string> = {
  order: 'ออเดอร์',
  integration: 'ช่องทาง',
  note: 'บันทึก',
  sync: 'Sync',
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', entity_type: '' });
  const { t, language } = useLanguage();

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenant_id: TENANT_ID, limit: '200' });
      if (filters.action) params.append('action', filters.action);
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      const res = await fetch(`${API_URL}/activity-logs?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return t('time.just_now');
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${t('time.minutes_ago')}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${t('time.hours_ago')}`;
    return date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getEntityLabel = (type: string) => {
    if (language === 'en') {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
    return ENTITY_LABELS[type] || type;
  };

  return (
    <Layout currentPage="activity-logs">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('activity.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('activity.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} className="input w-full md:w-40">
            <option value="">{t('activity.all_actions')}</option>
            {Object.entries(ACTION_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{t(val.labelKey)}</option>
            ))}
          </select>
          <select value={filters.entity_type} onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })} className="input w-full md:w-40">
            <option value="">{t('activity.all_types')}</option>
            <option value="order">{language === 'th' ? 'ออเดอร์' : 'Order'}</option>
            <option value="integration">{language === 'th' ? 'ช่องทาง' : 'Integration'}</option>
            <option value="sync">Sync</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-gray-100 dark:border-slate-700">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-gray-500 dark:text-gray-400">{t('activity.no_logs')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const config = ACTION_CONFIG[log.action] || { labelKey: log.action, icon: '📌', color: 'text-gray-600 bg-gray-100' };
            return (
              <div key={log.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}>
                    <span>{config.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 dark:text-white">{t(config.labelKey)}</p>
                      <span className="text-xs text-gray-400">{formatTime(log.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getEntityLabel(log.entity_type)}: {log.entity_id}</p>
                    {log.details?.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{log.details.description}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
