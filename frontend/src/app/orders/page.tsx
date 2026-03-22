'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TENANT_ID = 'test-shop';

interface Order {
  id: string;
  external_id: string;
  source: string;
  status: string;
  total: number;
  customer_name: string;
  customer_phone: string;
  created_at: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', source: '', search: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');

  const STATUS_CONFIG: Record<string, { labelKey: string; icon: string; bg: string }> = {
    pending: { labelKey: 'status.pending', icon: '⏳', bg: 'badge-warning' },
    paid: { labelKey: 'status.paid', icon: '💳', bg: 'badge-info' },
    packed: { labelKey: 'status.packed', icon: '📦', bg: 'badge-info' },
    shipped: { labelKey: 'status.shipped', icon: '🚚', bg: 'badge-info' },
    completed: { labelKey: 'status.completed', icon: '✅', bg: 'badge-success' },
    cancelled: { labelKey: 'status.cancelled', icon: '❌', bg: 'badge-error' },
  };

  const SOURCE_CONFIG: Record<string, { labelKey: string; color: string }> = {
    shopee: { labelKey: 'source.shopee', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    lazada: { labelKey: 'source.lazada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    tiktok: { labelKey: 'source.tiktok', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    shopify: { labelKey: 'source.shopify', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    csv: { labelKey: 'source.csv', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  };

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, filters.status, filters.source]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenant_id: TENANT_ID, page: String(pagination.page), limit: String(pagination.limit) });
      if (filters.status) params.append('status', filters.status);
      if (filters.source) params.append('source', filters.source);
      const res = await fetch(`${API_URL}/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setPagination(p => ({ ...p, total: data.pagination?.total || 0, total_pages: Math.ceil((data.pagination?.total || 0) / p.limit) }));
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(p => ({ ...p, page: 1 }));
    fetchOrders();
  };

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  };

  const toggleSelectAll = () => {
    setSelectedOrders(selectedOrders.length === orders.length ? [] : orders.map(o => o.id));
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedOrders.length === 0) return;
    try {
      await fetch(`${API_URL}/orders/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: TENANT_ID, order_ids: selectedOrders, status: bulkStatus }),
      });
      setSelectedOrders([]);
      setShowBulkModal(false);
      fetchOrders();
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  const exportToExcel = () => {
    const params = new URLSearchParams({ tenant_id: TENANT_ID });
    if (filters.status) params.append('status', filters.status);
    if (filters.source) params.append('source', filters.source);
    window.open(`${API_URL}/export/excel?${params}`, '_blank');
  };

  const formatCurrency = (value: number) => language === 'th' ? `฿${value.toLocaleString()}` : `$${Math.round(value / 35).toLocaleString()}`;

  return (
    <Layout currentPage="orders">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('orders.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{pagination.total} {t('dashboard.orders')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportToExcel} className="btn btn-secondary">📊 {t('orders.export')}</button>
          {selectedOrders.length > 0 && (
            <button onClick={() => setShowBulkModal(true)} className="btn btn-primary">
              {t('orders.change_status')} ({selectedOrders.length})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder={`🔍 ${t('orders.search')}`}
            className="input flex-1"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input w-full md:w-40"
          >
            <option value="">{t('orders.all_status')}</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{t(val.labelKey)}</option>
            ))}
          </select>
          <select
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            className="input w-full md:w-40"
          >
            <option value="">{t('orders.all_channels')}</option>
            {Object.entries(SOURCE_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{t(val.labelKey)}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">{t('orders.search_btn')}</button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-gray-100 dark:border-slate-700">
          <p className="text-4xl mb-4">📦</p>
          <p className="text-gray-500 dark:text-gray-400">{t('orders.no_orders')}</p>
        </div>
      ) : (
        <div className="table-container bg-white dark:bg-slate-800">
          <table className="table">
            <thead>
              <tr>
                <th className="w-10">
                  <input type="checkbox" checked={selectedOrders.length === orders.length} onChange={toggleSelectAll} className="rounded" />
                </th>
                <th>Order ID</th>
                <th>{language === 'th' ? 'ช่องทาง' : 'Channel'}</th>
                <th>{language === 'th' ? 'สถานะ' : 'Status'}</th>
                <th>{t('orders.customer')}</th>
                <th className="text-right">{t('orders.total')}</th>
                <th>{t('orders.date')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const source = SOURCE_CONFIG[order.source] || { labelKey: order.source, color: 'bg-gray-100 text-gray-700' };
                return (
                  <tr key={order.id} onClick={() => router.push(`/orders/${order.id}`)} className="cursor-pointer">
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => toggleSelectOrder(order.id)} className="rounded" />
                    </td>
                    <td className="font-medium text-gray-900 dark:text-white">{order.external_id}</td>
                    <td><span className={`badge ${source.color}`}>{t(source.labelKey)}</span></td>
                    <td><span className={`badge ${status.bg}`}>{status.icon} {t(status.labelKey)}</span></td>
                    <td>
                      <div className="text-gray-900 dark:text-white">{order.customer_name || '-'}</div>
                      <div className="text-xs text-gray-400">{order.customer_phone || ''}</div>
                    </td>
                    <td className="text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(order.total)}</td>
                    <td className="text-gray-500 dark:text-gray-400">{new Date(order.created_at).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1} className="btn btn-secondary disabled:opacity-50">←</button>
          <span className="text-sm text-gray-500 dark:text-gray-400">{pagination.page} / {pagination.total_pages}</span>
          <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.total_pages} className="btn btn-secondary disabled:opacity-50">→</button>
        </div>
      )}

      {/* Bulk Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('orders.change_status')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{selectedOrders.length} {t('dashboard.orders')}</p>
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="input mb-4">
              <option value="">{t('orders.select_status')}</option>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{t(val.labelKey)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowBulkModal(false)} className="btn btn-secondary flex-1">{t('orders.cancel')}</button>
              <button onClick={handleBulkUpdate} disabled={!bulkStatus} className="btn btn-primary flex-1 disabled:opacity-50">{t('orders.save')}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
