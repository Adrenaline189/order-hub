'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ConnectShopeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConnectShopeeModal({ isOpen, onClose, onSuccess }: ConnectShopeeModalProps) {
  const [formData, setFormData] = useState({
    partner_id: '',
    api_key: '',
    shop_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { language } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      setFormData({ partner_id: '', api_key: '', shop_id: '' });
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/auth/shopee/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'test-shop',
          partner_id: formData.partner_id,
          api_key: formData.api_key,
          shop_id: formData.shop_id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess();
        onClose();
        alert(language === 'th' ? 'เชื่อมต่อสำเร็จ!' : 'Connected successfully!');
      } else {
        setError(data.error || 'Failed to connect');
      }
    } catch (err) {
      setError('Connection failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <span className="text-xl">🛒</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {language === 'th' ? 'เชื่อมต่อ Shopee' : 'Connect Shopee'}
                </h3>
                <p className="text-sm text-gray-500">
                  {language === 'th' ? 'กรอกข้อมูลจาก Shopee Partner' : 'Enter your Shopee Partner credentials'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Partner ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Partner ID
            </label>
            <input
              type="text"
              value={formData.partner_id}
              onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
              placeholder="xxxxxxxx"
              required
              className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              {language === 'th' ? 'ดูได้จาก Shopee Partner Dashboard' : 'Find in Shopee Partner Dashboard'}
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key
            </label>
            <input
              type="text"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              placeholder="xxxxxxxxxxxxxxxx"
              required
              className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white font-mono text-sm"
            />
          </div>

          {/* Shop ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Shop ID
            </label>
            <input
              type="text"
              value={formData.shop_id}
              onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
              placeholder="xxxxxxxx"
              required
              className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              {language === 'th' ? 'ดูได้จาก Shopee Partner Dashboard → Shop List' : 'Find in Shopee Partner Dashboard → Shop List'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition"
            >
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  {language === 'th' ? 'กำลังเชื่อมต่อ...' : 'Connecting...'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  🔗 {language === 'th' ? 'เชื่อมต่อ' : 'Connect'}
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Help */}
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-b-2xl">
          <p className="text-xs text-gray-500">
            {language === 'th' ? (
              <>
                ต้องมี Shopee Partner Account{' '}
                <a href="https://partner.shopeemobile.com" target="_blank" className="text-orange-600 hover:underline">
                  สมัครที่นี่
                </a>
              </>
            ) : (
              <>
                Need Shopee Partner Account{' '}
                <a href="https://partner.shopeemobile.com" target="_blank" className="text-orange-600 hover:underline">
                  Register here
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
