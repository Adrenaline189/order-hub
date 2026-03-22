'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TENANT_ID = 'test-shop';

interface Integration {
  id: string;
  provider: string;
  shop_name: string;
  shop_domain?: string;
  connected: boolean;
  connected_at?: string;
  sync_enabled: boolean;
}

const PLATFORM_CONFIG: Record<string, { name: string; icon: string; color: string; bg: string; docs: string }> = {
  shopify: { 
    name: 'Shopify', 
    icon: '🛒', 
    color: 'text-emerald-600',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    docs: 'https://shopify.dev/docs/apps/build'
  },
  shopee: { 
    name: 'Shopee', 
    icon: '🟠', 
    color: 'text-orange-600',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    docs: 'https://open.shopee.com/'
  },
  lazada: { 
    name: 'Lazada', 
    icon: '🔵', 
    color: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    docs: 'https://open.lazada.com/'
  },
  tiktok: { 
    name: 'TikTok Shop', 
    icon: '🎵', 
    color: 'text-gray-800',
    bg: 'bg-gray-100 dark:bg-gray-800',
    docs: 'https://partner.tiktok.com/'
  },
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    fetchIntegrations();
    
    // Check for OAuth callback
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    if (connected) {
      setMessage({ type: 'success', text: `${PLATFORM_CONFIG[connected]?.name || connected} เชื่อมต่อสำเร็จแล้ว!` });
      // Clean URL
      window.history.replaceState({}, '', '/integrations');
    }
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

  const connectShopify = async () => {
    setConnecting('shopify');
    setMessage(null);
    
    try {
      // Get OAuth URL from backend
      const shop = prompt(language === 'th' 
        ? 'กรอก Shopify store URL ของคุณ\nเช่น: my-store.myshopify.com' 
        : 'Enter your Shopify store URL\ne.g.: my-store.myshopify.com',
        'demo-store.myshopify.com'
      );
      
      if (!shop) {
        setConnecting(null);
        return;
      }
      
      const res = await fetch(`${API_URL}/auth/shopify?shop=${shop}&tenant_id=${TENANT_ID}`);
      const data = await res.json();
      
      if (data.auth_url) {
        // Open OAuth in popup or redirect
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        window.open(
          data.auth_url,
          'shopify_oauth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        // Listen for message from OAuth callback
        window.addEventListener('message', (event) => {
          if (event.data?.type === 'shopify_connected') {
            setMessage({ type: 'success', text: language === 'th' ? 'เชื่อมต่อสำเร็จ!' : 'Connected!' });
            fetchIntegrations();
          }
        });
        
        // Poll for connection status
        setTimeout(() => {
          fetchIntegrations();
          setConnecting(null);
        }, 3000);
      } else {
        throw new Error(data.error?.message || 'Failed to get auth URL');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setConnecting(null);
    }
  };

  const connectShopee = () => {
    setMessage({ 
      type: 'error', 
      text: language === 'th' 
        ? 'Shopee API ต้องการ Partner Account - ติดต่อทีมงาน' 
        : 'Shopee API requires Partner Account - Contact us'
    });
  };

  const connectLazada = () => {
    setMessage({ 
      type: 'error', 
      text: language === 'th' 
        ? 'Lazada API กำลังอยู่ในช่วงพัฒนา' 
        : 'Lazada API coming soon'
    });
  };

  const connectTiktok = () => {
    setMessage({ 
      type: 'error', 
      text: language === 'th' 
        ? 'TikTok Shop API กำลังอยู่ในช่วงพัฒนา' 
        : 'TikTok Shop API coming soon'
    });
  };

  const syncIntegration = async (provider: string) => {
    setSyncing(provider);
    try {
      const res = await fetch(`${API_URL}/sync/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: TENANT_ID }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: language === 'th' 
            ? `ซิงค์สำเร็จ: ${data.synced.new} ออเดอร์ใหม่, ${data.synced.updated} อัพเดท` 
            : `Synced: ${data.synced.new} new, ${data.synced.updated} updated`
        });
      } else {
        throw new Error(data.error?.message || 'Sync failed');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSyncing(null);
    }
  };

  const disconnectIntegration = async (provider: string) => {
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

  const getPlatforms = () => {
    const platforms = Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
      const integration = integrations.find(i => i.provider === key);
      return { key, config, integration };
    });
    return platforms;
  };

  return (
    <Layout currentPage="integrations">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('integrations.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('integrations.subtitle')}</p>
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

        {/* Integration Cards */}
        <div className="space-y-4">
          {getPlatforms().map(({ key, config, integration }) => (
            <div 
              key={key} 
              className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 ${integration?.connected ? 'ring-2 ring-emerald-500/50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center text-2xl`}>
                    {config.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{config.name}</h3>
                    {integration?.connected ? (
                      <p className="text-sm text-emerald-600">
                        ✅ {integration.shop_name || integration.shop_domain || 'Connected'}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        {language === 'th' ? 'ยังไม่ได้เชื่อมต่อ' : 'Not connected'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {integration?.connected ? (
                    <>
                      <button
                        onClick={() => syncIntegration(key)}
                        disabled={syncing === key}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {syncing === key ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <span>🔄</span>
                        )}
                        {syncing === key ? (language === 'th' ? 'กำลังซิงค์...' : 'Syncing...') : (language === 'th' ? 'ซิงค์เลย' : 'Sync Now')}
                      </button>
                      <button
                        onClick={() => disconnectIntegration(key)}
                        className="px-4 py-2 bg-gray-100 hover:bg-red-100 dark:bg-slate-700 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-600 text-sm font-medium rounded-lg transition"
                      >
                        {language === 'th' ? 'ตัดการเชื่อมต่อ' : 'Disconnect'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        if (key === 'shopify') connectShopify();
                        else if (key === 'shopee') connectShopee();
                        else if (key === 'lazada') connectLazada();
                        else if (key === 'tiktok') connectTiktok();
                      }}
                      disabled={connecting === key}
                      className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {connecting === key ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          {language === 'th' ? 'กำลังเชื่อมต่อ...' : 'Connecting...'}
                        </>
                      ) : (
                        <>
                          <span>🔗</span>
                          {language === 'th' ? 'เชื่อมต่อ' : 'Connect'}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Status Details */}
              {integration?.connected && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <div className="flex gap-6 text-sm text-gray-500">
                    {integration.connected_at && (
                      <span>
                        {language === 'th' ? 'เชื่อมต่อเมื่อ' : 'Connected'}: {new Date(integration.connected_at).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 ${integration.sync_enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {integration.sync_enabled ? '✅' : '⚪'} {language === 'th' ? 'Auto Sync' : 'Auto Sync'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Help Text */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
            💡 {language === 'th' ? 'วิธีการเชื่อมต่อ' : 'How to Connect'}
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• <strong>Shopify:</strong> {language === 'th' ? 'กรอก store URL → Login → อนุญาต' : 'Enter store URL → Login → Authorize'}</li>
            <li>• <strong>Shopee:</strong> {language === 'th' ? 'ต้องมี Partner Account (ติดต่อทีมงาน)' : 'Requires Partner Account (Contact us)'}</li>
            <li>• <strong>Lazada:</strong> {language === 'th' ? 'กำลังพัฒนา' : 'Coming soon'}</li>
            <li>• <strong>TikTok Shop:</strong> {language === 'th' ? 'กำลังพัฒนา' : 'Coming soon'}</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
