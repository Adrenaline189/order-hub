'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TENANT_ID = 'test-shop';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  order_new: { icon: '📦', color: 'bg-blue-100 dark:bg-blue-900/30' },
  order_status: { icon: '🔄', color: 'bg-purple-100 dark:bg-purple-900/30' },
  sync_error: { icon: '❌', color: 'bg-red-100 dark:bg-red-900/30' },
  sync_success: { icon: '✅', color: 'bg-emerald-100 dark:bg-emerald-900/30' },
  system: { icon: '⚙️', color: 'bg-gray-100 dark:bg-gray-800' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { t, language } = useLanguage();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications?tenant_id=${TENANT_ID}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
      fetchNotifications();
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all?tenant_id=${TENANT_ID}`, { method: 'PATCH' });
      fetchNotifications();
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Layout currentPage="notifications">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('notifications.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{unreadCount} {t('notifications.new')}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="btn btn-secondary text-sm">
            ✓ {t('notifications.read_all')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'}`}>
          {t('notifications.all')}
        </button>
        <button onClick={() => setFilter('unread')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'unread' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'}`}>
          {t('notifications.unread')} ({unreadCount})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-gray-100 dark:border-slate-700">
          <p className="text-4xl mb-4">🔔</p>
          <p className="text-gray-500 dark:text-gray-400">{t('notifications.no_notifications')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markAsRead(n.id)}
                className={`bg-white dark:bg-slate-800 rounded-xl p-4 border cursor-pointer transition ${
                  n.is_read ? 'border-gray-100 dark:border-slate-700' : 'border-blue-200 dark:border-blue-800 ring-1 ring-blue-100 dark:ring-blue-900'
                }`}
              >
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}>
                    <span>{config.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 dark:text-white">{n.title}</p>
                      <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{n.message}</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
