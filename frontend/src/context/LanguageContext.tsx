'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type Language = 'th' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const translations: Record<Language, Record<string, string>> = {
  th: {
    // Common
    'app.name': 'Order Hub',
    'app.tagline': 'รวมออเดอร์หลายแพลตฟอร์ม',
    'app.description': 'ระบบรวมออเดอร์จาก Shopee, Lazada, TikTok Shop และช่องทางอื่นๆ',
    
    // Navigation
    'nav.dashboard': 'แดชบอร์ด',
    'nav.orders': 'ออเดอร์',
    'nav.revenue': 'รายได้',
    'nav.sync': 'ซิงค์',
    'nav.activity': 'กิจกรรม',
    'nav.chat': 'แชท',
    'nav.connections': 'เชื่อมต่อ',
    'nav.settings': 'ตั้งค่า',
    'nav.notifications': 'แจ้งเตือน',
    
    // Dashboard
    'dashboard.title': 'แดชบอร์ด',
    'dashboard.subtitle': 'ภาพรวมร้านค้าของคุณ',
    'dashboard.total_orders': 'ออเดอร์ทั้งหมด',
    'dashboard.total_revenue': 'ยอดขายรวม',
    'dashboard.pending': 'ค้างชำระ',
    'dashboard.to_ship': 'ค้างส่ง',
    'dashboard.orders': 'รายการ',
    'dashboard.value': 'มูลค่ารวม',
    'dashboard.order_status': 'สถานะออเดอร์',
    'dashboard.sales_channels': 'ช่องทางขาย',
    
    // Orders
    'orders.title': 'ออเดอร์',
    'orders.search': 'ค้นหา...',
    'orders.all_status': 'ทุกสถานะ',
    'orders.all_channels': 'ทุกช่องทาง',
    'orders.search_btn': 'ค้นหา',
    'orders.export': 'ส่งออก',
    'orders.change_status': 'เปลี่ยนสถานะ',
    'orders.no_orders': 'ยังไม่มีออเดอร์',
    'orders.customer': 'ลูกค้า',
    'orders.total': 'ยอด',
    'orders.date': 'วันที่',
    'orders.select_status': 'เลือกสถานะ',
    'orders.cancel': 'ยกเลิก',
    'orders.save': 'บันทึก',
    
    // Order Detail
    'order_detail.customer_info': 'ข้อมูลลูกค้า',
    'order_detail.payment_info': 'ยอดชำระ',
    'order_detail.items': 'สินค้า',
    'order_detail.notes': 'บันทึก',
    'order_detail.add_note': 'เพิ่มบันทึก...',
    'order_detail.delete': 'ลบ',
    'order_detail.print': 'พิมพ์',
    'order_detail.created': 'สร้าง',
    'order_detail.updated': 'อัพเดท',
    'order_detail.name': 'ชื่อ',
    'order_detail.phone': 'เบอร์โทร',
    'order_detail.email': 'อีเมล',
    'order_detail.address': 'ที่อยู่',
    'order_detail.no_notes': 'ยังไม่มีบันทึก',
    'order_detail.timeline': 'ไทม์ไลน์',
    'order_detail.no_timeline': 'ยังไม่มีไทม์ไลน์',
    
    // Status
    'status.pending': 'รอชำระ',
    'status.paid': 'ชำระแล้ว',
    'status.packed': 'แพ็คแล้ว',
    'status.shipped': 'ส่งแล้ว',
    'status.completed': 'สำเร็จ',
    'status.cancelled': 'ยกเลิก',
    
    // Sources
    'source.shopee': 'Shopee',
    'source.lazada': 'Lazada',
    'source.tiktok': 'TikTok Shop',
    'source.shopify': 'Shopify',
    'source.csv': 'CSV Import',
    
    // Revenue
    'revenue.title': 'รายได้',
    'revenue.subtitle': 'รายได้และสถิติการขาย',
    'revenue.total_revenue': 'รายได้รวม',
    'revenue.orders': 'ออเดอร์',
    'revenue.avg_order': 'เฉลี่ย/ออเดอร์',
    'revenue.trend': 'แนวโน้มรายได้',
    'revenue.by_source': 'รายได้ตามช่องทาง',
    'revenue.no_data': 'ยังไม่มีข้อมูล',
    'revenue.all': 'ทั้งหมด',
    'revenue.export': 'ส่งออก',
    
    // Period
    'period.today': 'วันนี้',
    'period.week': '7 วัน',
    'period.month': '30 วัน',
    'period.year': '1 ปี',
    
    // Date Range Picker
    'daterange.today': 'วันนี้',
    'daterange.yesterday': 'เมื่อวาน',
    'daterange.last_7_days': '7 วันล่าสุด',
    'daterange.last_30_days': '30 วันล่าสุด',
    'daterange.last_month': 'เดือนที่แล้ว',
    'daterange.last_90_days': '90 วันล่าสุด',
    'daterange.last_year': 'ปีที่แล้ว',
    'daterange.quick_select': 'เลือกเร็ว',
    'daterange.custom_range': 'กำหนดเอง',
    'daterange.from': 'จาก',
    'daterange.to': 'ถึง',
    'daterange.apply': 'ใช้งาน',
    
    // Integrations
    'integrations.title': 'เชื่อมต่อ',
    'integrations.subtitle': 'เชื่อมต่อช่องทางขายของคุณ',
    'integrations.connect': 'เชื่อมต่อ',
    'integrations.disconnect': 'ตัดการเชื่อมต่อ',
    'integrations.connected': 'เชื่อมต่อแล้ว',
    'integrations.pending': 'รอเชื่อมต่อ',
    'integrations.disconnected': 'ตัดการเชื่อมต่อ',
    'integrations.error': 'มีข้อผิดพลาด',
    'integrations.api_key': 'API Key',
    'integrations.api_secret': 'API Secret',
    'integrations.shop_id': 'Shop ID',
    'integrations.shop_name': 'ชื่อร้าน',
    
    // Sync
    'sync.title': 'สถานะ Sync',
    'sync.subtitle': 'สถานะการ sync จากทุกช่องทาง',
    'sync.refresh': 'รีเฟรช',
    'sync.today_syncs': 'Sync วันนี้',
    'sync.enabled': 'เปิด',
    'sync.disabled': 'ปิด',
    'sync.last_sync': 'Sync ล่าสุด',
    'sync.new': 'ใหม่',
    'sync.duplicate': 'ซ้ำ',
    'sync.no_sync': 'ยังไม่มีการ sync',
    'sync.no_channels': 'ยังไม่มีช่องทางที่เชื่อมต่อ',
    'sync.healthy': 'ปกติ',
    'sync.warning': 'มีปัญหา',
    'sync.unhealthy': 'ผิดปกติ',
    'sync.high': 'สำคัญ',
    'sync.medium': 'ระวัง',
    'sync.low': 'แจ้งเตือน',
    
    // Activity
    'activity.title': 'บันทึกกิจกรรม',
    'activity.subtitle': 'ประวัติกิจกรรมทั้งหมด',
    'activity.all_actions': 'ทุกการกระทำ',
    'activity.all_types': 'ทุกประเภท',
    'activity.no_logs': 'ไม่มีบันทึกกิจกรรม',
    'activity.created': 'สร้าง',
    'activity.status_change': 'เปลี่ยนสถานะ',
    'activity.note_add': 'เพิ่มบันทึก',
    'activity.note_delete': 'ลบบันทึก',
    'activity.sync': 'Sync',
    'activity.sync_error': 'Sync ล้มเหลว',
    'activity.export': 'ส่งออก',
    'activity.bulk_update': 'อัพเดทหลายรายการ',
    
    // Notifications
    'notifications.title': 'แจ้งเตือน',
    'notifications.new': 'รายการใหม่',
    'notifications.read_all': 'อ่านทั้งหมด',
    'notifications.all': 'ทั้งหมด',
    'notifications.unread': 'ยังไม่อ่าน',
    'notifications.no_notifications': 'ไม่มีการแจ้งเตือน',
    
    // Settings
    'settings.title': 'ตั้งค่า',
    'settings.subtitle': 'ตั้งค่าระบบ',
    'settings.theme': 'ธีม',
    'settings.light': '☀️ สว่าง',
    'settings.dark': '🌙 มืด',
    'settings.system': '💻 ตามระบบ',
    'settings.current': 'ปัจจุบัน',
    'settings.notifications': 'การแจ้งเตือน',
    'settings.order_new': 'ออเดอร์ใหม่',
    'settings.order_status': 'เปลี่ยนสถานะ',
    'settings.sync_error': 'Sync ล้มเหลว',
    'settings.daily_report': 'รายงานรายวัน',
    'settings.account': 'บัญชี',
    'settings.email': 'อีเมล',
    'settings.shop_name': 'ชื่อร้าน',
    'settings.danger_zone': 'พื้นที่อันตราย',
    'settings.delete_all': 'ลบข้อมูลทั้งหมด',
    'settings.save': 'บันทึกการตั้งค่า',
    'settings.saved': 'บันทึกแล้ว',
    'settings.language': 'ภาษา',
    'settings.thai': 'ไทย',
    'settings.english': 'อังกฤษ',
    
    // Auth
    'auth.login': 'เข้าสู่ระบบ',
    'auth.register': 'สมัครสมาชิก',
    'auth.logout': 'ออกจากระบบ',
    'auth.email': 'อีเมล',
    'auth.password': 'รหัสผ่าน',
    'auth.name': 'ชื่อ',
    'auth.login_btn': 'เข้าสู่ระบบ',
    'auth.register_btn': 'สมัครสมาชิก',
    'auth.logging_in': 'กำลังเข้าสู่ระบบ...',
    'auth.registering': 'กำลังสมัครสมาชิก...',
    'auth.no_account': 'ยังไม่มีบัญชี?',
    'auth.has_account': 'มีบัญชีแล้ว?',
    'auth.demo': '🎭 ใช้ Demo Account',
    
    // Home
    'home.hero.title': 'รวมออเดอร์จาก',
    'home.hero.highlight': ' ทุกช่องทาง',
    'home.hero.subtitle': 'Shopee, Lazada, TikTok Shop, Shopify และอื่นๆ — ดูในที่เดียว',
    'home.start': '🚀 เริ่มต้นใช้งาน',
    'home.features': 'ดูฟีเจอร์ทั้งหมด',
    'home.feature.connect.title': 'เชื่อมต่อง่าย',
    'home.feature.connect.desc': 'Shopee, Lazada, TikTok Shop, Shopify',
    'home.feature.dashboard.title': 'Dashboard ครบ',
    'home.feature.dashboard.desc': 'ดูยอดขาย ออเดอร์ค้าง สถิติทุกช่องทาง',
    'home.feature.alert.title': 'แจ้งเตือนฉับไว',
    'home.feature.alert.desc': 'ออเดอร์ใหม่ ค้างส่ง สินค้าใกล้หมด',
    'home.feature.export.title': 'Export ง่าย',
    'home.feature.export.desc': 'CSV, Excel พร้อมพิมพ์รายงาน',
    'home.pricing.title': 'ราคาที่เหมาะกับทุกขนาดร้าน',
    'home.pricing.popular': 'แนะนำ',
    'home.pricing.orders': 'ออเดอร์',
    'home.pricing.channels': 'ช่องทาง',
    'home.footer': '© 2026 Order Hub. สร้างด้วย ❤️ สำหรับร้านค้าไทย',
    
    // Time
    'time.just_now': 'เมื่อสักครู่',
    'time.minutes_ago': 'นาทีที่แล้ว',
    'time.hours_ago': 'ชั่วโมงที่แล้ว',
    
    // Empty states
    'empty.no_data': 'ไม่พบข้อมูล',
    'empty.loading': 'กำลังโหลด...',
  },
  
  en: {
    // Common
    'app.name': 'Order Hub',
    'app.tagline': 'Multi-platform Order Management',
    'app.description': 'Centralize orders from Shopee, Lazada, TikTok Shop and more',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.orders': 'Orders',
    'nav.revenue': 'Revenue',
    'nav.sync': 'Sync',
    'nav.activity': 'Activity',
    'nav.chat': 'Chat',
    'nav.connections': 'Connections',
    'nav.settings': 'Settings',
    'nav.notifications': 'Notifications',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Your store overview',
    'dashboard.total_orders': 'Total Orders',
    'dashboard.total_revenue': 'Total Revenue',
    'dashboard.pending': 'Pending',
    'dashboard.to_ship': 'To Ship',
    'dashboard.orders': 'orders',
    'dashboard.value': 'total value',
    'dashboard.order_status': 'Order Status',
    'dashboard.sales_channels': 'Sales Channels',
    
    // Orders
    'orders.title': 'Orders',
    'orders.search': 'Search...',
    'orders.all_status': 'All Status',
    'orders.all_channels': 'All Channels',
    'orders.search_btn': 'Search',
    'orders.export': 'Export',
    'orders.change_status': 'Change Status',
    'orders.no_orders': 'No orders yet',
    'orders.customer': 'Customer',
    'orders.total': 'Total',
    'orders.date': 'Date',
    'orders.select_status': 'Select status',
    'orders.cancel': 'Cancel',
    'orders.save': 'Save',
    
    // Order Detail
    'order_detail.customer_info': 'Customer Info',
    'order_detail.payment_info': 'Payment',
    'order_detail.items': 'Items',
    'order_detail.notes': 'Notes',
    'order_detail.add_note': 'Add note...',
    'order_detail.delete': 'Delete',
    'order_detail.print': 'Print',
    'order_detail.created': 'Created',
    'order_detail.updated': 'Updated',
    'order_detail.name': 'Name',
    'order_detail.phone': 'Phone',
    'order_detail.email': 'Email',
    'order_detail.address': 'Address',
    'order_detail.no_notes': 'No notes yet',
    'order_detail.timeline': 'Timeline',
    'order_detail.no_timeline': 'No timeline yet',
    
    // Status
    'status.pending': 'Pending',
    'status.paid': 'Paid',
    'status.packed': 'Packed',
    'status.shipped': 'Shipped',
    'status.completed': 'Completed',
    'status.cancelled': 'Cancelled',
    
    // Sources
    'source.shopee': 'Shopee',
    'source.lazada': 'Lazada',
    'source.tiktok': 'TikTok Shop',
    'source.shopify': 'Shopify',
    'source.csv': 'CSV Import',
    
    // Revenue
    'revenue.title': 'Revenue',
    'revenue.subtitle': 'Revenue and sales statistics',
    'revenue.total_revenue': 'Total Revenue',
    'revenue.orders': 'Orders',
    'revenue.avg_order': 'Avg Order',
    'revenue.trend': 'Revenue Trend',
    'revenue.by_source': 'Revenue by Source',
    'revenue.no_data': 'No data yet',
    'revenue.all': 'All',
    'revenue.export': 'Export',
    
    // Period
    'period.today': 'Today',
    'period.week': '7 Days',
    'period.month': '30 Days',
    'period.year': '1 Year',
    
    // Date Range Picker
    'daterange.today': 'Today',
    'daterange.yesterday': 'Yesterday',
    'daterange.last_7_days': 'Last 7 Days',
    'daterange.last_30_days': 'Last 30 Days',
    'daterange.last_month': 'Last Month',
    'daterange.last_90_days': 'Last 90 Days',
    'daterange.last_year': 'Last Year',
    'daterange.quick_select': 'Quick Select',
    'daterange.custom_range': 'Custom Range',
    'daterange.from': 'From',
    'daterange.to': 'To',
    'daterange.apply': 'Apply',
    
    // Integrations
    'integrations.title': 'Integrations',
    'integrations.subtitle': 'Connect your sales channels',
    'integrations.connect': 'Connect',
    'integrations.disconnect': 'Disconnect',
    'integrations.connected': 'Connected',
    'integrations.pending': 'Pending',
    'integrations.disconnected': 'Disconnected',
    'integrations.error': 'Error',
    'integrations.api_key': 'API Key',
    'integrations.api_secret': 'API Secret',
    'integrations.shop_id': 'Shop ID',
    'integrations.shop_name': 'Shop Name',
    
    // Sync
    'sync.title': 'Sync Status',
    'sync.subtitle': 'Sync status from all channels',
    'sync.refresh': 'Refresh',
    'sync.today_syncs': 'Syncs Today',
    'sync.enabled': 'On',
    'sync.disabled': 'Off',
    'sync.last_sync': 'Last Sync',
    'sync.new': 'new',
    'sync.duplicate': 'duplicate',
    'sync.no_sync': 'No sync yet',
    'sync.no_channels': 'No channels connected',
    'sync.healthy': 'Healthy',
    'sync.warning': 'Warning',
    'sync.unhealthy': 'Unhealthy',
    'sync.high': 'High',
    'sync.medium': 'Medium',
    'sync.low': 'Low',
    
    // Activity
    'activity.title': 'Activity Log',
    'activity.subtitle': 'All activity history',
    'activity.all_actions': 'All Actions',
    'activity.all_types': 'All Types',
    'activity.no_logs': 'No activity logs',
    'activity.created': 'Created',
    'activity.status_change': 'Status Change',
    'activity.note_add': 'Note Added',
    'activity.note_delete': 'Note Deleted',
    'activity.sync': 'Sync',
    'activity.sync_error': 'Sync Failed',
    'activity.export': 'Export',
    'activity.bulk_update': 'Bulk Update',
    
    // Notifications
    'notifications.title': 'Notifications',
    'notifications.new': 'new',
    'notifications.read_all': 'Read All',
    'notifications.all': 'All',
    'notifications.unread': 'Unread',
    'notifications.no_notifications': 'No notifications',
    
    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'System settings',
    'settings.theme': 'Theme',
    'settings.light': '☀️ Light',
    'settings.dark': '🌙 Dark',
    'settings.system': '💻 System',
    'settings.current': 'Current',
    'settings.notifications': 'Notifications',
    'settings.order_new': 'New Order',
    'settings.order_status': 'Status Change',
    'settings.sync_error': 'Sync Failed',
    'settings.daily_report': 'Daily Report',
    'settings.account': 'Account',
    'settings.email': 'Email',
    'settings.shop_name': 'Shop Name',
    'settings.danger_zone': 'Danger Zone',
    'settings.delete_all': 'Delete All Data',
    'settings.save': 'Save Settings',
    'settings.saved': 'Saved',
    'settings.language': 'Language',
    'settings.thai': 'Thai',
    'settings.english': 'English',
    
    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.logout': 'Logout',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Name',
    'auth.login_btn': 'Login',
    'auth.register_btn': 'Register',
    'auth.logging_in': 'Logging in...',
    'auth.registering': 'Registering...',
    'auth.no_account': "Don't have an account?",
    'auth.has_account': 'Already have an account?',
    'auth.demo': '🎭 Use Demo Account',
    
    // Home
    'home.hero.title': 'Centralize orders from',
    'home.hero.highlight': ' every channel',
    'home.hero.subtitle': 'Shopee, Lazada, TikTok Shop, Shopify and more — all in one place',
    'home.start': '🚀 Get Started',
    'home.features': 'View All Features',
    'home.feature.connect.title': 'Easy Connect',
    'home.feature.connect.desc': 'Shopee, Lazada, TikTok Shop, Shopify',
    'home.feature.dashboard.title': 'Full Dashboard',
    'home.feature.dashboard.desc': 'View sales, pending orders, all channel stats',
    'home.feature.alert.title': 'Instant Alerts',
    'home.feature.alert.desc': 'New orders, pending shipments, low stock',
    'home.feature.export.title': 'Easy Export',
    'home.feature.export.desc': 'CSV, Excel with printable reports',
    'home.pricing.title': 'Pricing for every store size',
    'home.pricing.popular': 'Popular',
    'home.pricing.orders': 'orders',
    'home.pricing.channels': 'channels',
    'home.footer': '© 2026 Order Hub. Made with ❤️ for merchants.',
    
    // Time
    'time.just_now': 'Just now',
    'time.minutes_ago': 'minutes ago',
    'time.hours_ago': 'hours ago',
    
    // Empty states
    'empty.no_data': 'No data found',
    'empty.loading': 'Loading...',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('th');

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language | null;
    if (saved && (saved === 'th' || saved === 'en')) {
      setLanguage(saved);
    }
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language][key] || key;
  }, [language]);

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
