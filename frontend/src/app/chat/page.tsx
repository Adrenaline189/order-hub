'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TENANT_ID = 'test-shop';

interface Message {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  type: string;
  status: string;
  created_at: string;
}

interface Conversation {
  id: string;
  provider: string;
  customer_name: string;
  customer_avatar?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: string;
}

const PROVIDERS = [
  { key: 'all', label: 'all', icon: '🌐' },
  { key: 'line', label: 'LINE', icon: '💚' },
];

const PROVIDER_COLORS: Record<string, string> = {
  line: 'bg-green-100 text-green-700',
  shopee: 'bg-orange-100 text-orange-700',
  lazada: 'bg-blue-100 text-blue-700',
  tiktok: 'bg-gray-100 text-gray-700',
  shopify: 'bg-emerald-100 text-emerald-700',
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showAutoReply, setShowAutoReply] = useState(false);
  const [autoReplyRules, setAutoReplyRules] = useState<any[]>([]);
  const [newRule, setNewRule] = useState({ keyword: '', response: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    fetchConversations();
  }, [activeTab]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const params = new URLSearchParams({ tenant_id: TENANT_ID });
      if (activeTab !== 'all') params.append('provider', activeTab);
      
      const res = await fetch(`${API_URL}/chat/conversations?${params}`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`${API_URL}/chat/conversations/${conversationId}?tenant_id=${TENANT_ID}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;
    
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/chat/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: TENANT_ID,
          content: newMessage.trim(),
        }),
      });
      
      const data = await res.json();
      
      if (data.message) {
        setMessages([...messages, data.message]);
        setNewMessage('');
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return language === 'th' ? 'เพิ่งส่ง' : 'Just now';
    if (diffMins < 60) return `${diffMins}${language === 'th' ? ' นาที' : 'm'}`;
    if (diffHours < 24) return `${diffHours}${language === 'th' ? ' ชม.' : 'h'}`;
    if (diffDays < 7) return `${diffDays}${language === 'th' ? ' วัน' : 'd'}`;
    return date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getProviderIcon = (provider: string) => {
    const p = PROVIDERS.find(p => p.key === provider);
    return p?.icon || '💬';
  };

  // Count by provider
  const countByProvider = (provider: string) => {
    if (provider === 'all') return conversations.length;
    return conversations.filter(c => c.provider === provider).length;
  };

  return (
    <Layout currentPage="chat">
      <div className="flex h-[calc(100vh-120px)] gap-4">
        {/* Conversation List */}
        <div className="w-80 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                💬 {language === 'th' ? 'แชท' : 'Chat'}
              </h2>
              <button
                onClick={() => setShowAutoReply(!showAutoReply)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
                title={language === 'th' ? 'ตั้งค่า Auto Reply' : 'Auto Reply Settings'}
              >
                ⚙️
              </button>
            </div>
            
            {/* Platform Tabs */}
            <div className="flex flex-wrap gap-1">
              {PROVIDERS.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1 ${
                    activeTab === key 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{language === 'th' && key === 'all' ? 'ทั้งหมด' : label}</span>
                  {key !== 'all' && countByProvider(key) > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                      activeTab === key ? 'bg-white/20' : 'bg-gray-200 dark:bg-slate-600'
                    }`}>
                      {countByProvider(key)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-2">💬</p>
                <p>{language === 'th' ? 'ยังไม่มีข้อความ' : 'No messages yet'}</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 border-b border-gray-50 dark:border-slate-700/50 text-left hover:bg-gray-50 dark:hover:bg-slate-700/30 transition ${
                    selectedConversation?.id === conv.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-lg">
                        {getProviderIcon(conv.provider)}
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {conv.customer_name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${PROVIDER_COLORS[conv.provider] || 'bg-gray-100 text-gray-700'}`}>
                          {conv.provider.toUpperCase()}
                        </span>
                        <p className="text-sm text-gray-500 truncate">
                          {conv.last_message || (language === 'th' ? 'เริ่มการสนทนา' : 'Start conversation')}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Connect LINE Button */}
          <div className="p-4 border-t border-gray-100 dark:border-slate-700">
            <button
              onClick={() => window.open(`${API_URL}/auth/line?tenant_id=${TENANT_ID}`, '_blank')}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
            >
              <span>➕</span>
              {language === 'th' ? 'เชื่อมต่อแพลตฟอร์ม' : 'Connect Platform'}
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-lg">
                    {getProviderIcon(selectedConversation.provider)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {selectedConversation.customer_name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${PROVIDER_COLORS[selectedConversation.provider] || 'bg-gray-100 text-gray-700'}`}>
                      {selectedConversation.provider.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.direction === 'outbound'
                          ? 'bg-blue-500 text-white rounded-br-md'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-bl-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-1 text-xs ${
                        msg.direction === 'outbound' ? 'text-blue-100 justify-end' : 'text-gray-400'
                      }`}>
                        <span>{new Date(msg.created_at).toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.direction === 'outbound' && (
                          <span>{msg.status === 'sent' ? '✓' : msg.status === 'pending' ? '○' : '✗'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-100 dark:border-slate-700">
                <div className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={language === 'th' ? 'พิมพ์ข้อความ...' : 'Type a message...'}
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      rows={1}
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      '➤'
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-6xl mb-4">💬</p>
                <p className="text-lg font-medium">
                  {language === 'th' ? 'เลือกการสนทนา' : 'Select a conversation'}
                </p>
                <p className="text-sm mt-1">
                  {language === 'th' ? 'เลือกข้อความจากรายการด้านซ้าย' : 'Choose a message from the list'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Auto Reply Panel */}
        {showAutoReply && (
          <div className="w-80 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-bold text-gray-900 dark:text-white">
                ⚡ {language === 'th' ? 'Auto Reply' : 'Auto Reply'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {language === 'th' ? 'ตั้งค่าการตอบอัตโนมัติ' : 'Set up auto-reply rules'}
              </p>
            </div>
            
            {/* Add Rule Form */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-700">
              <input
                type="text"
                value={newRule.keyword}
                onChange={(e) => setNewRule({ ...newRule, keyword: e.target.value })}
                placeholder={language === 'th' ? 'คีย์เวิร์ด (เช่น ราคา)' : 'Keyword (e.g. price)'}
                className="w-full px-3 py-2 mb-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              <textarea
                value={newRule.response}
                onChange={(e) => setNewRule({ ...newRule, response: e.target.value })}
                placeholder={language === 'th' ? 'ข้อความตอบ...' : 'Reply message...'}
                className="w-full px-3 py-2 mb-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                rows={2}
              />
              <button className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition">
                {language === 'th' ? 'เพิ่มกฎ' : 'Add Rule'}
              </button>
            </div>
            
            {/* Rules List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-gray-400 font-medium uppercase">
                {language === 'th' ? 'กฎที่มี' : 'Active Rules'}
              </p>
              {autoReplyRules.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  {language === 'th' ? 'ยังไม่มีกฎ' : 'No rules yet'}
                </p>
              ) : (
                autoReplyRules.map((rule) => (
                  <div key={rule.id} className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">{rule.keyword}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                        {rule.enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{rule.response}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
