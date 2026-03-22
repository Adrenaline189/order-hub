'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  currency: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  shipping_address: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  notes: string;
  notes_list: Array<{ id: string; text: string; created_at: string }>;
  created_at: string;
  updated_at: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { labelKey: string; icon: string; color: string; bg: string }> = {
  pending: { labelKey: 'status.pending', icon: '⏳', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  paid: { labelKey: 'status.paid', icon: '💳', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  packed: { labelKey: 'status.packed', icon: '📦', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  shipped: { labelKey: 'status.shipped', icon: '🚚', color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  completed: { labelKey: 'status.completed', icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  cancelled: { labelKey: 'status.cancelled', icon: '❌', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
};

const SOURCE_CONFIG: Record<string, { labelKey: string; color: string }> = {
  shopee: { labelKey: 'source.shopee', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  lazada: { labelKey: 'source.lazada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  tiktok: { labelKey: 'source.tiktok', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  shopify: { labelKey: 'source.shopify', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  csv: { labelKey: 'source.csv', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { t, language } = useLanguage();

  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const [orderRes, timelineRes] = await Promise.all([
        fetch(`${API_URL}/orders/${orderId}?tenant_id=${TENANT_ID}`),
        fetch(`${API_URL}/orders/${orderId}/timeline?tenant_id=${TENANT_ID}`),
      ]);
      const orderData = await orderRes.json();
      const timelineData = await timelineRes.json();
      if (orderData.order) {
        setOrder(orderData.order);
        setNewStatus(orderData.order.status);
      }
      setTimeline(timelineData.timeline || []);
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!order || newStatus === order.status) return;
    setUpdating(true);
    try {
      await fetch(`${API_URL}/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: TENANT_ID, status: newStatus }),
      });
      setShowStatusModal(false);
      fetchOrder();
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  const addNote = async () => {
    if (!order || !newNote.trim()) return;
    try {
      await fetch(`${API_URL}/orders/${order.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: TENANT_ID, note: newNote.trim() }),
      });
      setNewNote('');
      fetchOrder();
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!order) return;
    try {
      await fetch(`${API_URL}/orders/${order.id}/notes/${noteId}?tenant_id=${TENANT_ID}`, { method: 'DELETE' });
      fetchOrder();
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  const printOrder = () => window.print();

  const formatCurrency = (value: number) => language === 'th' ? `฿${value.toLocaleString()}` : `$${Math.round(value / 35).toLocaleString()}`;

  if (loading) {
    return (
      <Layout currentPage="orders">
        <div className="space-y-4">
          <div className="skeleton h-32 w-full" />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="skeleton h-48" />
            <div className="skeleton h-48" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout currentPage="orders">
        <div className="text-center py-12">
          <p className="text-4xl mb-4">📦</p>
          <p className="text-gray-500">{language === 'th' ? 'ไม่พบออเดอร์' : 'Order not found'}</p>
        </div>
      </Layout>
    );
  }

  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const source = SOURCE_CONFIG[order.source] || { labelKey: order.source, color: 'bg-gray-100 text-gray-700' };

  return (
    <Layout currentPage="orders">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{order.external_id}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`badge ${source.color}`}>{t(source.labelKey)}</span>
            <span className={`badge ${status.bg} ${status.color}`}>{status.icon} {t(status.labelKey)}</span>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={printOrder} className="btn btn-secondary">🖨️ {t('order_detail.print')}</button>
          <button onClick={() => setShowStatusModal(true)} className="btn btn-primary">{t('orders.change_status')}</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Payment */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('order_detail.customer_info')}</h2>
              <div className="space-y-3 text-sm">
                <div><p className="text-gray-400">{t('order_detail.name')}</p><p className="font-medium text-gray-900 dark:text-white">{order.customer_name || '-'}</p></div>
                <div><p className="text-gray-400">{t('order_detail.phone')}</p><p className="font-medium text-gray-900 dark:text-white">{order.customer_phone || '-'}</p></div>
                <div><p className="text-gray-400">{t('order_detail.email')}</p><p className="font-medium text-gray-900 dark:text-white">{order.customer_email || '-'}</p></div>
                <div><p className="text-gray-400">{t('order_detail.address')}</p><p className="font-medium text-gray-900 dark:text-white">{order.shipping_address || '-'}</p></div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('order_detail.payment_info')}</h2>
              <p className="text-3xl font-bold text-emerald-600 mb-4">{formatCurrency(order.total)}</p>
              <div className="text-sm text-gray-400">
                <p>{t('order_detail.created')}: {new Date(order.created_at).toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}</p>
                <p>{t('order_detail.updated')}: {new Date(order.updated_at).toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('order_detail.items')} ({order.items?.length || 0})</h2>
            {order.items?.length > 0 ? (
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-sm text-gray-400">x{item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">-</p>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('order_detail.timeline')}</h2>
            {timeline.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-slate-700" />
                <div className="space-y-4">
                  {timeline.map((event, idx) => (
                    <div key={event.id} className="flex gap-4">
                      <div className={`w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center ${idx === 0 ? 'ring-2 ring-blue-500' : ''}`}>
                        <span className="text-xs">{event.type === 'created' ? '✨' : event.type === 'status_change' ? '🔄' : event.type === 'note_add' ? '📝' : '📌'}</span>
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-gray-900 dark:text-white">{event.title}</p>
                        {event.description && <p className="text-sm text-gray-500 dark:text-gray-400">{event.description}</p>}
                        <p className="text-xs text-gray-400 mt-1">{new Date(event.created_at).toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">{t('order_detail.no_timeline')}</p>
            )}
          </div>
        </div>

        {/* Right Column - Notes */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('order_detail.notes')}</h2>
            
            <div className="mb-4 print:hidden">
              <div className="flex gap-2">
                <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={t('order_detail.add_note')} className="input flex-1" />
                <button onClick={addNote} disabled={!newNote.trim()} className="btn btn-primary disabled:opacity-50">+</button>
              </div>
            </div>

            {order.notes_list?.length > 0 ? (
              <div className="space-y-3">
                {order.notes_list.map((note) => (
                  <div key={note.id} className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{note.text}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-400">{new Date(note.created_at).toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}</p>
                      <button onClick={() => deleteNote(note.id)} className="text-xs text-red-500 hover:text-red-600 print:hidden">{t('order_detail.delete')}</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">{t('order_detail.no_notes')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('orders.change_status')}</h2>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input mb-4">
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{t(val.labelKey)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowStatusModal(false)} className="btn btn-secondary flex-1">{t('orders.cancel')}</button>
              <button onClick={updateStatus} disabled={updating || newStatus === order.status} className="btn btn-primary flex-1 disabled:opacity-50">{t('orders.save')}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
