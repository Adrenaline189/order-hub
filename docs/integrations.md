# คำแนะนำการเชื่อมต่อแพลตฟอร์ม

## 🛒 Shopify

### วิธีที่ 1: Private App (เร็วสุด - แนะนำ)

#### ขั้นตอนที่ 1: เปิดใช้งาน Custom App
1. เข้า Shopify Admin ของร้าน: `https://[ร้าน].myshopify.com/admin`
2. ไปที่ **Settings** → **Apps and sales channels**
3. กด **Develop apps** (ด้านบน)
4. กด **Allow custom app development** → กด **Allow**
5. กด **Create a legacy custom app**

#### ขั้นตอนที่ 2: ตั้งค่า App
1. ตั้งชื่อ App: `Order Hub`
2. ไปที่ **Configuration** → **Storefront API access scopes**
3. เลือก scopes ที่ต้องการ:
   - `read_orders` - ดึงข้อมูลคำสั่งซื้อ
   - `read_products` - ดึงข้อมูลสินค้า
4. กด **Save**

#### ขั้นตอนที่ 3: ติดตั้ง App
1. ไปที่ **API credentials** (ด้านบน)
2. กด **Install app** → กด **Install**

#### ขั้นตอนที่ 4: ดึง Admin API access token
1. ไปที่ **API credentials** (ด้านบน)
2. กด **Reveal token once** ด้านล่าง
3. **Copy** Admin API access token

#### ขั้นตอนที่ 5: นำมาใส่ใน Order Hub
1. เปิด Order Hub → ไปที่ **Connections**
2. กด **Connect Shopify**
3. กรอก:
   - **Store URL**: `https://[ร้าน].myshopify.com`
   - **Admin API Token**: (token ที่ copy มา)
4. กด **เชื่อมต่อ**

#### ⚠️ ข้อควรรู้
- Token จะแสดงเพียงครั้งเดียว - ต้องเก็บไว้!
- ถ้าหลง token ต้องสร้างใหม่
- App ต้องติดตั้งก่อนถึงจะใช้งานได้

---

## 💚 LINE Official Account

### สิ่งที่ต้องมี
- LINE Official Account (OA)
- LINE Developer Console Access

#### ขั้นตอนที่ 1: สร้าง Messaging API Channel
1. ไปที่ https://developers.line.me/
2. Login ด้วย LINE Account ที่เชื่อมกับ OA
3. กด **Create a channel**
4. เลือก **Messaging API** → กด **Proceed**
5. กรอกข้อมูล:
   - Channel name: `Order Hub`
   - Category: ตามธุรกิจของคุณ
   - Subcategory: ตามประเภทสินค้า
6. กด **Create**

#### ขั้นตอนที่ 2: เปิดใช้งาน Messaging API
1. ใน Channel ที่สร้าง → ไป **Basic settings**
2. กด **Enable** ที่ Messaging API

#### ขั้นตอนที่ 3: ดึง Channel Access Token
1. ไปที่ **Messaging API** tab
2. กด **Issue** ที่ Long-lived channel access token
3. **Copy** Token

#### ขั้นตอนที่ 4: ตั้งค่า Webhook (สำหรับรับข้อความ)
1. ใน **Messaging API** tab
2. ที่ **Webhooks URL** กรอก:
   ```
   https://[your-backend].railway.app/webhook/line
   ```
3. กด **Verify** (ถ้าขึ้น Success = ต่อได้)

#### ขั้นตอนที่ 5: นำมาใส่ใน Order Hub
1. เปิด Order Hub → ไปที่ **Connections**
2. กด **Connect LINE**
3. กรอก:
   - **Channel ID**: ดูได้จาก Basic settings
   - **Channel Secret**: ดูได้จาก Basic settings
   - **Channel Access Token**: ที่ Issue มา
4. กด **เชื่อมต่อ**

---

## 🟠 Shopee

### สิ่งที่ต้องมี
- Shopee Partner Account
- Shopee Seller Account

#### ขั้นตอนที่ 1: สมัคร Partner
1. ไปที่ https://partner.shopeemobile.com/
2. สมัคร Partner Account
3. รอ Approval (1-3 วันทำการ)

#### ขั้นตอนที่ 2: สร้าง App
1. เมื่อได้รับ Approval → Login Partner Dashboard
2. ไปที่ **My Apps** → **Create App**
3. กรอกข้อมูล:
   - App Name: `Order Hub`
   - Description: ระบบจัดการคำสั่งซื้อ
4. กด **Submit**

#### ขั้นตอนที่ 3: ดึง API Credentials
1. ไปที่ App ที่สร้าง
2. ดู **Partner ID** และ **API Key**

#### ขั้นตอนที่ 4: ดึง Shop ID
1. ใน Partner Dashboard → **Account** → **Shop List**
2. ดู **Shop ID** ของร้านที่ต้องการเชื่อม

#### ⚠️ ข้อควรรู้
- ต้องรอ Approval จาก Shopee ก่อนถึงจะใช้งานได้
- อาจใช้เวลา 1-3 วันทำการ
- ถ้าต้องการ Production ใช้งานจริง ต้อง Submit App สำหรับ Shopee Review

---

## 🟡 Lazada

### สิ่งที่ต้องมี
- Lazada Seller Account
- Lazada Open Platform Account

#### ขั้นตอนที่ 1: สมัคร Open Platform
1. ไปที่ https://open.lazada.com/
2. Login ด้วย Lazada Seller Account
3. ไปที่ **My Apps** → **Create App**
4. กรอกข้อมูล:
   - App Name: `Order Hub`
   - App Type: เลือกตามความเหมาะสม
5. กด **Create**

#### ขั้นตอนที่ 2: ดึง API Credentials
1. ใน App ที่สร้าง → **App Credentials**
2. Copy **App Key** และ **App Secret**

#### ขั้นตอนที่ 3: ตั้งค่า Redirect URL
1. ใน **App Settings**
2. เพิ่ม Redirect URL:
   ```
   https://[your-backend].railway.app/auth/lazada/callback
   ```

#### ⚠️ ข้อควรรู้
- ต้องมี Seller Account ก่อนถึงจะสร้าง App ได้
- ถ้ายังไม่มี สมัครได้ที่ https://seller.lazada.co.th/

---

## 📋 สรุป Credentials ที่ต้องนำมาใส่

### Shopify
| Field | หาได้จาก |
|-------|----------|
| Store URL | https://[ร้าน].myshopify.com |
| Admin API Token | App → API credentials → Reveal token |

### LINE
| Field | หาได้จาก |
|-------|----------|
| Channel ID | Basic settings |
| Channel Secret | Basic settings |
| Access Token | Messaging API → Issue |

### Shopee
| Field | หาได้จาก |
|-------|----------|
| Partner ID | Partner Dashboard → My Apps |
| API Key | Partner Dashboard → My Apps |

### Lazada
| Field | หาได้จาก |
|-------|----------|
| App Key | Open Platform → My Apps |
| App Secret | Open Platform → My Apps |

---

## 🔒 ความปลอดภัย

### การเก็บ Credentials
- Credentials จะถูกเก็บอย่างปลอดภัยใน Database
- เข้ารหัสก่อนเก็บ (Encrypted)
- ไม่แสดงใน Log หรือ UI

### สิ่งที่ควรทำ
✅ เก็บ Credentials ไว้อย่างปลอดภัย  
✅ เปลี่ยน Token ถ้าสงสัยว่าหลุด  
✅ ใช้ HTTPS สำหรับทุกการเชื่อมต่อ

### สิ่งที่ไม่ควรทำ
❌ แชร์ Credentials ผ่าน Chat สาธารณะ  
❌ เขียน Credentials ใน Code  
❌ ใช้ Credentials ที่หมดอายุ  

---

## ❓ ต้องการความช่วยเหลือ?

หรือมีปัญหาในการเชื่อมต่อ → ติดต่อทีมงาน Order Hub
