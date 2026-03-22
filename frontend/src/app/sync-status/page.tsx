'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TENANT_ID = 'test-shop';

interface SyncStatus {
  integration_id: string;
  provider: string;
  shop_name: string;
  last_sync: { id: string; status: string; orders_synced: number; orders_skipped: number; started_at: string; error: string | null } | null;
  today_syncs: number;
  total_orders: number;
  health: 'healthy' | 'warning' | 'unhealthy';
  sync_enabled: boolean;
}

interface SyncAlert {
  type: string;
  severity: 'high' | 'medium' | 'low';
  provider?: string;
  shop_name?: string;
  message: string;
  created_at: string;
}

const PROVIDER_CONFIG: Record<string, { labelKey: string; color: string; bg: string }> = {
  shopee: { labelKey: 'source.shopee', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  lazada: { labelKey: 'source.lazada', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  tiktok: { labelKey: 'source.tiktok', color: 'text-gray-800', bg: 'bg-gray-100 dark:bg-gray-800' },
  shopify: { labelKey: 'source.shopify', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
};

const HEALTH_CONFIG = {
  healthy: { labelKey: 'sync.healthy', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: '✅' },
  warning: { labelKey: 'sync.warning', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: '⚠️' },
  unhealthy: { labelKey: 'sync.unhealthy', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', icon: '❌' },
};

export default function SyncStatusPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus[]>([]);
  const [alerts, setAlerts] = useState<SyncAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statusRes, alertsRes] = await Promise.all([
        fetch(`${API_URL}/sync/status?tenant_id=${TENANT_ID}`),
        fetch(`${API_URL}/sync/alerts?tenant_id=${TENANT_ID}`),
      ]);
      const statusData = await statusRes.json();
      const alertsData = await alertsRes.json();
      setSyncStatus(statusData.integrations || []);
      setAlerts(alertsData.alerts || []);
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async (provider: string) => {
    try {
      await fetch(`${API_URL}/mock/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: TENANT_ID, provider }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  const formatTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    
    try {
      const date = new Date(dateStr);
      
      // Check if valid date
      if (isNaN(date.getTime())) return '-';
      
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      // Future date or negative diff
      if (diff < 0) return t('time.just_now');
      
      // Less than 1 minute
      if (diff < 60000) return t('time.just_now');
      
      // Less than 1 hour
      if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return language === 'th' ? `${mins} นาทีที่แล้ว` : `${mins} ${t('time.minutes_ago')}`;
      }
      
      // Less than 24 hours
      if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return language === 'th' ? `${hours} ชั่วโมงที่แล้ว` : `${hours} ${t('time.hours_ago')}`;
      }
      
      // More than 24 hours - show date
      return date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, { th: string; en: string }> = {
      high: { th: 'สำคัญ', en: 'High' },
      medium: { th: 'ระวัง', en: 'Medium' },
      low: { th: 'แจ้งเตือน', en: 'Low' },
    };
    return labels[severity]?.[language] || severity;
  };

  const getHealthLabel = (health: string) => {
    const labels: Record<string, { th: string; en: string }> = {
      healthy: { th: 'ปกติ', en: 'Healthy' },
      warning: { th: 'มีปัญหา', en: 'Warning' },
      unhealthy: { th: 'ผิดปกติ', en: 'Unhealthy' },
    };
    return labels[health]?.[language] || health;
  };

  return (
    <Layout currentPage="sync-status">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('sync.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('sync.subtitle')}</p>
        </div>
        <button onClick={fetchData} className="btn btn-secondary">🔄 {t('sync.refresh')}</button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((alert, idx) => (
            <div key={idx} className={`p-4 rounded-xl border-l-4 ${
              alert.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
              alert.severity === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500' :
              'bg-gray-50 dark:bg-slate-800 border-gray-400'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{alert.message}</p>
                  {alert.provider && (
                    <p className="text-sm text-gray-500 mt-1">
                      {t(PROVIDER_CONFIG[alert.provider]?.labelKey || alert.provider)}
                      {alert.shop_name && ` - ${alert.shop_name}`}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  alert.severity === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                  alert.severity === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {getSeverityLabel(alert.severity)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-64" />)}
        </div>
      ) : syncStatus.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-gray-100 dark:border-slate-700">
          <p className="text-4xl mb-4">🔗</p>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t('sync.no_channels')}</p>
          <Link href="/integrations" className="btn btn-primary">
            {language === 'th' ? 'เชื่อมต่อช่องทางแรก' : 'Connect Your First Channel'}
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {syncStatus.map((item) => {
            const provider = PROVIDER_CONFIG[item.provider] || { labelKey: item.provider, bg: 'bg-gray-100' };
            const health = HEALTH_CONFIG[item.health] || HEALTH_CONFIG.unhealthy;

            return (
              <div key={item.integration_id} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700">
                <div className={`${provider.bg} p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{t(provider.labelKey)}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{item.shop_name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${health.bg} ${health.color}`}>
                      {health.icon} {getHealthLabel(item.health)}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{item.total_orders}</p>
                      <p className="text-xs text-gray-400">{language === 'th' ? 'ออเดอร์' : 'Orders'}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{item.today_syncs}</p>
                      <p className="text-xs text-gray-400">{language === 'th' ? 'ซิงค์วันนี้' : 'Syncs Today'}</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${item.sync_enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {item.sync_enabled ? '✓' : '✗'}
                      </p>
                      <p className="text-xs text-gray-400">{item.sync_enabled ? (language === 'th' ? 'เปิด' : 'On') : (language === 'th' ? 'ปิด' : 'Off')}</p>
                    </div>
                  </div>
                  
                  {item.last_sync ? (
                    <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                      <p className="text-xs text-gray-400 mb-2">
                        {language === 'th' ? 'ซิงค์ล่าสุด' : 'Last Sync'}: {formatTime(item.last_sync.started_at)}
                      </p>
                      <div className="flex gap-4 text-sm">
                        <span className="text-emerald-600">
                          ✓ {item.last_sync.orders_synced} {language === 'th' ? 'ใหม่' : 'new'}
                        </span>
                        {item.last_sync.orders_skipped > 0 && (
                          <span className="text-gray-400">
                            ⏭️ {item.last_sync.orders_skipped} {language === 'th' ? 'ซ้ำ' : 'dup'}
                          </span>
                        )}
                      </div>
                      {item.last_sync.error && (
                        <p className="text-xs text-red-500 mt-2 truncate">❌ {item.last_sync.error}</p>
                      )}
                    </div>
                  ) : item.sync_enabled ? (
                    <div className="pt-4 border-t border-gray-100 dark:border-slate-700 text-center">
                      <p className="text-sm text-gray-400 mb-3">{language === 'th' ? 'ยังไม่มีการซิงค์' : 'No sync yet'}</p>
                      <button
                        onClick={() => triggerSync(item.provider)}
                        className="btn btn-primary w-full text-sm"
                      >
                        🔄 {language === 'th' ? 'ซิงค์เลย' : 'Sync Now'}
                      </button>
                    </div>
                  ) : (
                    <div className="pt-4 border-t border-gray-100 dark:border-slate-700 text-center">
                      <p className="text-sm text-gray-400 mb-3">{language === 'th' ? 'ยังไม่ได้เชื่อมต่อ' : 'Not connected'}</p>
                      <Link href="/integrations" className="btn btn-primary w-full text-sm">
                        🔗 {language === 'th' ? 'เชื่อมต่อ' : 'Connect'}
                      </Link>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  {item.sync_enabled && (
                    <div className="pt-3 mt-3 border-t border-gray-100 dark:border-slate-700 flex gap-2">
                      <button
                        onClick={() => triggerSync(item.provider)}
                        disabled={!item.sync_enabled}
                        className="btn btn-secondary flex-1 text-xs disabled:opacity-50"
                      >
                        🔄 {language === 'th' ? 'ซิงค์' : 'Sync'}
                      </button>
                      <Link
                        href="/integrations"
                        className="btn btn-ghost text-xs"
                      >
                        ⚙️
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
