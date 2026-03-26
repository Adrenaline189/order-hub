'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';
import ConnectShopifyModal from '@/components/ConnectShopifyModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TENANT_ID = 'test-shop';

interface IntegrationDetails {
  id: string;
  provider: string;
  provider_name?: string;
  shop_domain?: string;
  shop_name?: string;
  connected: boolean;
  connected_at?: string;
  status?: string;
}

export default function ManageConnectionPage() {
  const params = useParams();
  const router = useRouter();
  const provider = params.provider as string;
  const { t, language } = useLanguage();
  
  const [integration, setIntegration] = useState<IntegrationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [disconnecting, setDisconnected] = useState(false);

  useEffect(() => {
    fetchIntegration();
  }, [provider]);

  const fetchIntegration = async () => {
    try {
      const res = await fetch(`${API_URL}/integrations?tenant_id=${TENANT_ID}`);
      const data = await res.json();
      const found = (data.integrations || []).find((i: any) => i.provider === provider);
      setIntegration(found || null);
    } catch (err) {
      console.error('Failed to fetch integration:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(language === 'th' ? 'ต้องการยกเลิกการเชื่อมต่อ?' : 'Are you sure you want to disconnect?')) {
      return;
    }

    setDisconnected(true);
    try {
      const res = await fetch(`${API_URL}/auth/${provider}/disconnect?tenant_id=${TENANT_ID}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (data.success) {
        router.push('/connections');
      }
    } catch (err) {
      console.error('Disconnect failed:', err);
    } finally {
      setDisconnected(false);
    }
  };

  const getProviderInfo = () => {
    const info: Record<string, any> = {
      shopify: {
        name: 'Shopify',
        icon: '🛒',
        color: 'bg-emerald-100 text-emerald-700',
        description: language === 'th' ? 'เชื่อมต่อร้านค้า Shopify' : 'Connect your Shopify store',
      },
      line: {
        name: 'LINE Official Account',
        icon: '💚',
        color: 'bg-green-100 text-green-700',
        description: language === 'th' ? 'เชื่อมต่อ LINE OA' : 'Connect your LINE Official Account',
      },
      shopee: {
        name: 'Shopee',
        icon: '🛒',
        color: 'bg-orange-100 text-orange-700',
        description: language === 'th' ? 'เชื่อมต่อ Shopee' : 'Connect your Shopee store',
      },
      lazada: {
        name: 'Lazada',
        icon: '🛍️',
        color: 'bg-blue-100 text-blue-700',
        description: language === 'th' ? 'เชื่อมต่อ Lazada' : 'Connect your Lazada store',
      },
      tiktok: {
        name: 'TikTok Shop',
        icon: '🎵',
        color: 'bg-gray-100 text-gray-700',
        description: language === 'th' ? 'เชื่อมต่อ TikTok Shop' : 'Connect your TikTok Shop',
      },
    };
    return info[provider] || { name: provider, icon: '🔗', color: 'bg-gray-100 text-gray-700', description: '' };
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin text-2xl">⏳</div>
        </div>
      </Layout>
    );
  }

  if (!integration) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl text-center">
            <p className="text-yellow-800 dark:text-yellow-200">
              {language === 'th' ? 'ไม่พบการเชื่อมต่อนี้' : 'Integration not found'}
            </p>
            <button
              onClick={() => router.push('/connections')}
              className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600"
            >
              {language === 'th' ? 'กลับไปหน้า Connections' : 'Back to Connections'}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const providerInfo = getProviderInfo();

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/connections')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            ←
          </button>
          <div className={`w-12 h-12 rounded-xl ${providerInfo.color} flex items-center justify-center text-2xl`}>
            {providerInfo.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {language === 'th' ? 'จัดการ' : 'Manage'} {providerInfo.name}
            </h1>
            <p className="text-gray-500">{providerInfo.description}</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-6">
          <h2 className="font-medium text-gray-900 dark:text-white mb-4">
            {language === 'th' ? 'สถานะการเชื่อมต่อ' : 'Connection Status'}
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                {language === 'th' ? 'สถานะ' : 'Status'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                integration.connected 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {integration.connected ? (language === 'th' ? 'เชื่อมต่อแล้ว' : 'Connected') : (language === 'th' ? 'ยังไม่เชื่อมต่อ' : 'Disconnected')}
              </span>
            </div>

            {integration.shop_domain && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {language === 'th' ? 'Domain' : 'Domain'}
                </span>
                <span className="text-gray-900 dark:text-white font-mono text-sm">
                  {integration.shop_domain}
                </span>
              </div>
            )}

            {integration.shop_name && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {language === 'th' ? 'ชื่อร้าน' : 'Store Name'}
                </span>
                <span className="text-gray-900 dark:text-white">
                  {integration.shop_name}
                </span>
              </div>
            )}

            {integration.connected_at && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {language === 'th' ? 'วันที่เชื่อมต่อ' : 'Connected At'}
                </span>
                <span className="text-gray-900 dark:text-white text-sm">
                  {new Date(integration.connected_at).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Credentials Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-gray-900 dark:text-white">
              {language === 'th' ? 'ข้อมูล Credentials' : 'Credentials'}
            </h2>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
            >
              {language === 'th' ? 'แก้ไข' : 'Edit'}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400 text-sm">Store URL</span>
              <span className="text-gray-900 dark:text-white font-mono text-sm">
                {integration.shop_domain || '-'}
              </span>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            💡 {language === 'th' 
              ? 'กดปุ่มแก้ไขเพื่ออัพเดท credentials' 
              : 'Click edit to update credentials'}
          </p>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h2 className="font-medium text-gray-900 dark:text-white mb-4">
            {language === 'th' ? 'จัดการอื่นๆ' : 'Other Actions'}
          </h2>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/orders')}
              className="w-full p-4 text-left bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition"
            >
              <span className="font-medium text-gray-900 dark:text-white">
                {language === 'th' ? '📦 ดูออเดอร์' : '📦 View Orders'}
              </span>
              <span className="block text-sm text-gray-500 mt-1">
                {language === 'th' ? 'ดูรายการคำสั่งซื้อจากแพลตฟอร์มนี้' : 'View orders from this platform'}
              </span>
            </button>

            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="w-full p-4 text-left bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition disabled:opacity-50"
            >
              <span className="font-medium text-red-600 dark:text-red-300">
                {disconnecting ? '...' : '🔌 ยกเลิกการเชื่อมต่อ'}
              </span>
              <span className="block text-sm text-red-500 mt-1">
                {language === 'th' ? 'เอา ' + providerInfo.name + ' ออกจากระบบ' : 'Remove ' + providerInfo.name + ' from Order Hub'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {provider === 'shopify' && (
        <ConnectShopifyModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchIntegration();
          }}
        />
      )}
    </Layout>
  );
}
