'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';
import ConnectShopifyModal from '@/components/ConnectShopifyModal';
import ConnectLazadaModal from '@/components/ConnectLazadaModal';
import ConnectShopeeModal from '@/components/ConnectShopeeModal';
import ConnectLINEModal from '@/components/ConnectLINEModal';
import ConnectTikTokModal from '@/components/ConnectTikTokModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TENANT_ID = 'test-shop';

interface Integration {
  id: string;
  provider: string;
  provider_name?: string;
  shop_name?: string;
  shop_domain?: string;
  connected: boolean;
  connected_at?: string;
  status?: string;
}

const ORDER_PLATFORMS = [
  { 
    key: 'shopify', 
    name: 'Shopify', 
    icon: '🛒', 
    color: 'bg-emerald-100 text-emerald-700',
    bg: 'bg-emerald-500',
    description: 'Sync orders from Shopify store',
    docs: 'https://shopify.dev/docs/apps'
  },
  { 
    key: 'shopee', 
    name: 'Shopee', 
    icon: '🛒', 
    color: 'bg-orange-100 text-orange-700',
    bg: 'bg-orange-500',
    description: 'Sync orders from Shopee marketplace',
    docs: 'https://open.shopee.com/'
  },
  { 
    key: 'lazada', 
    name: 'Lazada', 
    icon: '🛍️', 
    color: 'bg-blue-100 text-blue-700',
    bg: 'bg-blue-500',
    description: 'Sync orders from Lazada marketplace',
    docs: 'https://open.lazada.com/'
  },
  { 
    key: 'tiktok', 
    name: 'TikTok Shop', 
    icon: '🎵', 
    color: 'bg-gray-100 text-gray-700',
    bg: 'bg-gray-800',
    description: 'Sync orders from TikTok Shop',
    docs: 'https://partner.tiktok.com/'
  },
];

const CHAT_PLATFORMS = [
  { 
    key: 'line', 
    name: 'LINE Official Account', 
    icon: '💚', 
    color: 'bg-green-100 text-green-700',
    bg: 'bg-green-500',
    description: 'Auto-reply & customer chat via LINE',
    docs: 'https://developers.line.me/'
  },
  { 
    key: 'shopee_chat', 
    name: 'Shopee Chat', 
    icon: '🛒', 
    color: 'bg-orange-100 text-orange-700',
    bg: 'bg-orange-500',
    description: 'Chat with Shopee customers',
    docs: 'https://open.shopee.com/'
  },
  { 
    key: 'lazada_chat', 
    name: 'Lazada Chat', 
    icon: '🛍️', 
    color: 'bg-blue-100 text-blue-700',
    bg: 'bg-blue-500',
    description: 'Chat with Lazada customers',
    docs: 'https://open.lazada.com/'
  },
  { 
    key: 'tiktok_chat', 
    name: 'TikTok Chat', 
    icon: '🎵', 
    color: 'bg-gray-100 text-gray-700',
    bg: 'bg-gray-800',
    description: 'Chat with TikTok customers',
    docs: 'https://partner.tiktok.com/'
  },
];

export default function ConnectionsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [showLazadaModal, setShowLazadaModal] = useState(false);
  const [showShopeeModal, setShowShopeeModal] = useState(false);
  const [showLINEModal, setShowLINEModal] = useState(false);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const { t, language } = useLanguage();

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch(`${API_URL}/integrations?tenant_id=${TENANT_ID}`);
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIntegration = (provider: string) => {
    return integrations.find(i => i.provider === provider && i.connected);
  };

  const connectLINE = async () => {
    setConnecting('line');
    try {
      const shop = prompt(
        language === 'th' 
          ? 'กรอก LINE Official Account ID หรือ Email ที่ล็อกอิน\nเช่น: @your-oa' 
          : 'Enter LINE Official Account ID or Email\n e.g.: @your-oa',
        '@'
      );
      
      if (!shop) {
        setConnecting(null);
        return;
      }
      
      const res = await fetch(`${API_URL}/auth/line?tenant_id=${TENANT_ID}`);
      const data = await res.json();
      
      if (data.auth_url) {
        window.open(data.auth_url, 'line_oauth', 'width=500,height=700');
        setMessage({ type: 'success', text: language === 'th' ? 'กรุณาอนุญาตในหน้าต่างที่เปิดขึ้น' : 'Please authorize in the popup window' });
      } else {
        throw new Error(data.error?.message || 'Failed to get auth URL');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setTimeout(() => setConnecting(null), 3000);
    }
  };

  const handleConnect = (platform: string) => {
    if (platform === 'shopify') {
      setShowShopifyModal(true);
    } else if (platform === 'lazada') {
      setShowLazadaModal(true);
    } else if (platform === 'shopee') {
      setShowShopeeModal(true);
    } else if (platform === 'line') {
      setShowLINEModal(true);
    } else if (platform === 'tiktok') {
      setShowTikTokModal(true);
    }
  };

  const handleChat = (platform: string) => {
    if (platform === 'line') {
      window.location.href = '/chat';
    } else {
      setMessage({ 
        type: 'error', 
        text: language === 'th' 
          ? `${platform} Chat กำลังอยู่ในช่วงพัฒนา` 
          : `${platform} Chat coming soon`
      });
    }
  };

  const disconnect = async (provider: string) => {
    if (!confirm(language === 'th' ? 'ยืนยันการตัดการเชื่อมต่อ?' : 'Confirm disconnect?')) {
      return;
    }
    
    try {
      await fetch(`${API_URL}/integrations/${provider}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: TENANT_ID }),
      });
      
      setMessage({ type: 'success', text: language === 'th' ? 'ตัดการเชื่อมต่อแล้ว' : 'Disconnected' });
      fetchIntegrations();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to disconnect' });
    }
  };

  const isConnected = (key: string) => {
    return getIntegration(key)?.connected;
  };

  return (
    <Layout currentPage="connections">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🔗 {language === 'th' ? 'การเชื่อมต่อ' : 'Connections'}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'th' ? 'เชื่อมต่อแพลตฟอร์มเพื่อ Sync ออเดอร์และรับ-ส่งแชท' : 'Connect platforms to sync orders and manage chat'}
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
            <div className="flex items-center gap-2">
              <span>{message.type === 'success' ? '✅' : '❌'}</span>
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Order Sync Section */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center text-xl">
              📦
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {language === 'th' ? 'Order Sync' : 'Order Sync'}
              </h2>
              <p className="text-sm text-gray-500">
                {language === 'th' ? 'ดึงออเดอร์จากแต่ละแพลตฟอร์ม' : 'Sync orders from each platform'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {ORDER_PLATFORMS.map((platform) => {
              const connected = isConnected(platform.key);
              const integration = getIntegration(platform.key);
              
              return (
                <div 
                  key={platform.key}
                  className={`bg-white dark:bg-slate-800 rounded-xl border-2 transition ${
                    connected 
                      ? 'border-emerald-500 shadow-emerald-100 dark:shadow-emerald-900/20' 
                      : 'border-gray-100 dark:border-slate-700'
                  }`}
                >
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${platform.color} flex items-center justify-center text-2xl`}>
                        {platform.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          {platform.name}
                          {connected && (
                            <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">
                              ✅ {language === 'th' ? 'เชื่อมต่อแล้ว' : 'Connected'}
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500">{platform.description}</p>
                        {connected && integration?.shop_name && (
                          <p className="text-xs text-emerald-600 mt-1">
                            {integration.shop_name}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {connected ? (
                        <>
                          <button
                            onClick={() => window.location.href = '/orders'}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition"
                          >
                            📋 {language === 'th' ? 'จัดการ' : 'Manage'}
                          </button>
                          <button
                            onClick={() => disconnect(platform.key)}
                            className="px-4 py-2 bg-gray-100 hover:bg-red-100 dark:bg-slate-700 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-600 text-sm font-medium rounded-lg transition"
                          >
                            {language === 'th' ? 'ตัดการเชื่อมต่อ' : 'Disconnect'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleConnect(platform.key)}
                          disabled={connecting === platform.key}
                          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                        >
                          {connecting === platform.key ? (
                            <span className="flex items-center gap-2">
                              <span className="animate-spin">⏳</span>
                              {language === 'th' ? 'กำลังเชื่อมต่อ...' : 'Connecting...'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              ➕ {language === 'th' ? 'เชื่อมต่อ' : 'Connect'}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Chat / Auto-Reply Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center text-xl">
              💬
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {language === 'th' ? 'Chat & Auto-Reply' : 'Chat & Auto-Reply'}
              </h2>
              <p className="text-sm text-gray-500">
                {language === 'th' ? 'รับ-ส่งแชทและตอบอัตโนมัติ' : 'Receive-send chat and auto-reply'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {CHAT_PLATFORMS.map((platform) => {
              const connected = isConnected(platform.key);
              const integration = getIntegration(platform.key);
              
              return (
                <div 
                  key={platform.key}
                  className={`bg-white dark:bg-slate-800 rounded-xl border-2 transition ${
                    connected 
                      ? 'border-green-500 shadow-green-100 dark:shadow-green-900/20' 
                      : 'border-gray-100 dark:border-slate-700'
                  }`}
                >
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${platform.color} flex items-center justify-center text-2xl`}>
                        {platform.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          {platform.name}
                          {connected && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                              ✅ {language === 'th' ? 'เชื่อมต่อแล้ว' : 'Connected'}
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500">{platform.description}</p>
                        {connected && integration?.connected_at && (
                          <p className="text-xs text-green-600 mt-1">
                            {language === 'th' ? 'เชื่อมต่อเมื่อ' : 'Connected'}: {new Date(integration.connected_at).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {connected ? (
                        <>
                          <button
                            onClick={() => handleChat(platform.key)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition"
                          >
                            💬 {language === 'th' ? 'แชท' : 'Chat'}
                          </button>
                          <button
                            onClick={() => window.location.href = '/chat'}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition"
                          >
                            ⚙️ {language === 'th' ? 'ตั้งค่า' : 'Settings'}
                          </button>
                          <button
                            onClick={() => disconnect(platform.key)}
                            className="px-4 py-2 bg-gray-100 hover:bg-red-100 dark:bg-slate-700 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-600 text-sm font-medium rounded-lg transition"
                          >
                            {language === 'th' ? 'ตัดการเชื่อมต่อ' : 'Disconnect'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleConnect(platform.key)}
                          disabled={connecting === platform.key}
                          className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                        >
                          {connecting === platform.key ? (
                            <span className="flex items-center gap-2">
                              <span className="animate-spin">⏳</span>
                              {language === 'th' ? 'กำลังเชื่อมต่อ...' : 'Connecting...'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              ➕ {language === 'th' ? 'เชื่อมต่อ' : 'Connect'}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Help */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
            💡 {language === 'th' ? 'ต้องการความช่วยเหลือ?' : 'Need Help?'}
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• {language === 'th' ? 'ต้องมี Account ของแต่ละแพลตฟอร์มก่อนเชื่อมต่อ' : 'You need an account on each platform before connecting'}</li>
            <li>• {language === 'th' ? 'LINE ต้องมี LINE Official Account (OA)' : 'LINE requires a LINE Official Account (OA)'}</li>
            <li>• {language === 'th' ? 'Shopee/Lazada ต้องเป็น Partner หรือใช้ API credentials ของตัวเอง' : 'Shopee/Lazada requires Partner status or your own API credentials'}</li>
          </ul>
        </div>

        {/* Shopify Connect Modal */}
        <ConnectShopifyModal
          isOpen={showShopifyModal}
          onClose={() => setShowShopifyModal(false)}
          onSuccess={fetchIntegrations}
        />

        {/* Lazada Connect Modal */}
        <ConnectLazadaModal
          isOpen={showLazadaModal}
          onClose={() => setShowLazadaModal(false)}
          onSuccess={fetchIntegrations}
        />

        {/* Shopee Connect Modal */}
        <ConnectShopeeModal
          isOpen={showShopeeModal}
          onClose={() => setShowShopeeModal(false)}
          onSuccess={fetchIntegrations}
        />

        {/* LINE Connect Modal */}
        <ConnectLINEModal
          isOpen={showLINEModal}
          onClose={() => setShowLINEModal(false)}
          onSuccess={fetchIntegrations}
        />

        {/* TikTok Connect Modal */}
        <ConnectTikTokModal
          isOpen={showTikTokModal}
          onClose={() => setShowTikTokModal(false)}
          onSuccess={fetchIntegrations}
        />
      </div>
    </Layout>
  );
}
