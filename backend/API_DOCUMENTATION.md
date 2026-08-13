# 🔗 داکومنت API بخش Bokhar

> **تاریخ آپدیت:** 2026-08-13  
> **نسخه API:** v1  
> **Base URL:** `http://localhost:8000/api/` یا `https://bokhar.ir/api/`

---

## 📑 فهرست محتویات

1. [احراز هویت (Authentication)](#احراز-هویت)
2. [مدیریت کاربران (Users)](#مدیریت-کاربران)
3. [محصولات (Products)](#محصولات)
4. [سبد خرید (Cart)](#سبد-خرید)
5. [سفارشات (Orders)](#سفارشات)
6. [تنظیمات سفارش (Order Settings)](#تنظیمات-سفارش)
7. [آدرس‌ها (Addresses)](#آدرس‌ها)
8. [تخفیف‌ها و کوپن (Discounts & Coupons)](#تخفیف‌ها-و-کوپن)
9. [اعلان‌ها (Notifications)](#اعلان‌ها)
10. [کیف پول (Wallet)](#کیف-پول)
11. [گزارش‌ها (Reports)](#گزارش‌ها)
12. [بلیط‌های پشتیبانی (Support Tickets)](#بلیط‌های-پشتیبانی)

---

## 🔐 احراز هویت

### 1. ارسال کد یکبار مصرف (OTP)
```
POST /api/send/otp/
```

**توضیح:** برای ورود یا ثبت‌نام، کد یکبار مصرف به شماره تلفن ارسال می‌شود.

**درخواست:**
```json
{
  "phone": "09123456789"
}
```

**پاسخ موفق (200):**
```json
{
  "detail": "کد ارسال شد"
}
```

---

### 2. تأیید کد OTP
```
POST /api/verify/otp/
```

**توضیح:** کد دریافت‌شده را تأیید می‌کند.

**درخواست:**
```json
{
  "phone": "09123456789",
  "code": "123456"
}
```

**پاسخ موفق (200):**
```json
{
  "access": "eyJhbGc...",
  "refresh": "eyJhbGc..."
}
```

---

### 3. ثبت‌نام با OTP
```
POST /api/register/otp/
```

**درخواست:**
```json
{
  "phone": "09123456789",
  "code": "123456",
  "name": "علی رضایی"
}
```

**پاسخ موفق (201):**
```json
{
  "user": {
    "id": 1,
    "phone": "09123456789",
    "name": "علی رضایی"
  },
  "access": "eyJhbGc...",
  "refresh": "eyJhbGc..."
}
```

---

### 4. ورود با رمز عبور
```
POST /api/login/
```

**درخواست:**
```json
{
  "phone": "09123456789",
  "password": "your_password"
}
```

**پاسخ موفق (200):**
```json
{
  "access": "eyJhbGc...",
  "refresh": "eyJhbGc..."
}
```

---

### 5. تحدیث توکن
```
POST /api/refresh/
```

**توضیح:** توکن جدید با استفاده از refresh token دریافت کنید.

**درخواست:**
```json
{
  "refresh": "eyJhbGc..."
}
```

**پاسخ موفق (200):**
```json
{
  "access": "eyJhbGc..."
}
```

---

### 6. خروج از حساب
```
POST /api/logout/
```

**توضیح:** توکن را بلاک کرده و کاربر را خارج می‌کند.

**درخواست:**
```json
{
  "refresh": "eyJhbGc..."
}
```

**پاسخ موفق (200):**
```json
{
  "detail": "با موفقیت خارج شدید"
}
```

---

### 7. دریافت توکن CSRF
```
GET /api/csrf/
```

**توضیح:** توکن CSRF برای درخواست‌های نامحفوظ دریافت کنید.

**پاسخ موفق (200):**
```json
{
  "csrfToken": "..."
}
```

---

## 👤 مدیریت کاربران

### 1. لیست مشتریان
```
GET /api/customers/
Authorization: Bearer {access_token}
```

**پاسخ موفق (200):**
```json
{
  "count": 150,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "phone": "09123456789",
      "name": "علی رضایی",
      "email": "ali@example.com",
      "is_active": true,
      "created_at": "2026-08-01T10:30:00Z"
    }
  ]
}
```

---

### 2. جزئیات یک مشتری
```
GET /api/customers/{id}/
Authorization: Bearer {access_token}
```

---

### 3. ویرایش نام کاربر
```
POST /api/edit/name/
Authorization: Bearer {access_token}
```

**درخواست:**
```json
{
  "name": "علی رضایی جدید"
}
```

**پاسخ موفق (200):**
```json
{
  "detail": "نام با موفقیت بروزرسانی شد"
}
```

---

### 4. تغییر رمز عبور
```
POST /api/edit/password/
Authorization: Bearer {access_token}
```

**درخواست:**
```json
{
  "old_password": "old_pass",
  "new_password": "new_pass"
}
```

**پاسخ موفق (200):**
```json
{
  "detail": "رمز عبور تغییر یافت"
}
```

---

### 5. مجلس‌های فعال کاربر
```
GET /api/sessions/
Authorization: Bearer {access_token}
```

**پاسخ موفق (200):**
```json
{
  "results": [
    {
      "id": 1,
      "user_agent": "Mozilla/5.0...",
      "ip_address": "192.168.1.1",
      "last_activity": "2026-08-13T01:00:00Z"
    }
  ]
}
```

---

### 6. حذف یک مجلس
```
DELETE /api/sessions/{id}/
Authorization: Bearer {access_token}
```

---

## 📦 محصولات

### 1. لیست دسته‌بندی‌ها
```
GET /api/public/categories/
```

**پاسخ موفق (200):**
```json
[
  {
    "id": 1,
    "name": "شلوار",
    "description": "انواع شلوار",
    "is_active": true
  }
]
```

---

### 2. لیست محصولات (عمومی)
```
GET /api/public/products/
```

**Query Parameters:**
- `category` - فیلتر بر اساس دسته‌بندی
- `search` - جستجو

**پاسخ موفق (200):**
```json
[
  {
    "id": 1,
    "name": "شلوار مشکی",
    "category": "شلوار",
    "price": 150000,
    "image": "url",
    "description": "...",
    "is_active": true
  }
]
```

---

### 3. جزئیات محصول (عمومی)
```
GET /api/public/products/{id}/
```

**پاسخ موفق (200):**
```json
{
  "id": 1,
  "name": "شلوار مشکی",
  "category": "شلوار",
  "price": 150000,
  "image": "url",
  "description": "شلوار کتان مشکی",
  "sizes": ["S", "M", "L"],
  "materials": ["کتان", "ابریشم"],
  "is_active": true
}
```

---

### 4. لیست محصولات (ادمین/فروشنده)
```
GET /api/products/
Authorization: Bearer {access_token}
```

**نیاز به:** `IsSeller` permission

---

### 5. اضافه کردن محصول جدید
```
POST /api/products/create/
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**درخواست:**
```json
{
  "name": "شلوار جدید",
  "category": 1,
  "price": 200000,
  "description": "توضیح",
  "image": "<file>",
  "sizes": ["S", "M"],
  "materials": ["کتان"]
}
```

---

### 6. جستجوی محصول
```
GET /api/products/search/?q=شلوار
Authorization: Bearer {access_token}
```

---

## 🛒 سبد خرید

### 1. مشاهده سبد خرید
```
GET /api/cart/
Authorization: Bearer {access_token}
```

**پاسخ موفق (200):**
```json
{
  "items": [
    {
      "id_unique": "prod_1_M",
      "product_id": 1,
      "product_name": "شلوار مشکی",
      "quantity": 2,
      "size": "M",
      "material": "کتان",
      "price": 150000,
      "subtotal": 300000
    }
  ],
  "total_price": 300000
}
```

---

### 2. اضافه کردن محصول به سبد
```
POST /api/cart/add/{product_id}/
Authorization: Bearer {access_token}
```

**درخواست:**
```json
{
  "quantity": 2,
  "size": "M",
  "material": "کتان",
  "service": "washing"
}
```

**پاسخ موفق (201):**
```json
{
  "message": "محصول به سبد اضافه شد",
  "item": {...}
}
```

---

### 3. بروزرسانی تعداد آیتم
```
PATCH /api/cart/update/{id_unique}/
Authorization: Bearer {access_token}
```

**درخواست:**
```json
{
  "quantity": 5
}
```

---

### 4. حذف آیتم از سبد
```
DELETE /api/cart/remove/{id_unique}/
Authorization: Bearer {access_token}
```

---

### 5. خالی کردن کل سبد
```
POST /api/cart/delete/
Authorization: Bearer {access_token}
```

---

## 📦 سفارشات

### 1. لیست سفارش‌های پرداخت‌شده
```
GET /api/order/list/paid/
Authorization: Bearer {access_token}
```

---

### 2. لیست سفارش‌های در حال شستشو
```
GET /api/order/list/washing/
Authorization: Bearer {access_token}
```

---

### 3. لیست سفارش‌های تحویل‌شده
```
GET /api/order/list/delivered/
Authorization: Bearer {access_token}
```

---

### 4. لیست سفارش‌های لغوشده
```
GET /api/order/list/canceled/
Authorization: Bearer {access_token}
```

---

### 5. لیست سفارش‌های برگشتی
```
GET /api/order/list/returned/
Authorization: Bearer {access_token}
```

---

### 6. جستجوی سفارش
```
GET /api/order/search/?q=order_id
Authorization: Bearer {access_token}
```

---

### 7. تاریخچه وضعیت سفارش
```
GET /api/order/{order_id}/history/
Authorization: Bearer {access_token}
```

**پاسخ موفق (200):**
```json
[
  {
    "status": "paid",
    "timestamp": "2026-08-13T10:30:00Z",
    "note": "پرداخت شد"
  },
  {
    "status": "washing",
    "timestamp": "2026-08-13T11:00:00Z",
    "note": "شروع شستشو"
  }
]
```

---

### 8. تغییر وضعیت سفارش به "انتخاب شده"
```
POST /api/order/status/pick/
Authorization: Bearer {access_token}
```

**درخواست:**
```json
{
  "order_ids": [1, 2, 3]
}
```

---

### 9. تغییر وضعیت سفارش به "شستشو"
```
POST /api/order/status/washing/
Authorization: Bearer {access_token}
```

---

### 10. تغییر وضعیت سفارش به "تحویل"
```
POST /api/order/status/delivery/
Authorization: Bearer {access_token}
```

---

### 11. خلاصه سفارش
```
GET /api/order/order-summary/
Authorization: Bearer {access_token}
```

**پاسخ موفق (200):**
```json
{
  "cart_total": 300000,
  "delivery_fee": 50000,
  "discount": 10000,
  "total": 340000
}
```

---

## ⚙️ تنظیمات سفارش

### 1. تنظیمات هزینه شتاب
```
GET /api/order/rush-fee-settings/
Authorization: Bearer {access_token}
```

**پاسخ موفق (200):**
```json
{
  "id": 1,
  "rush_fee_amount": 50000,
  "rush_fee_percentage": 10,
  "is_active": true
}
```

---

### 2. بروزرسانی تنظیمات هزینه شتاب
```
PUT /api/order/rush-fee-settings/
Authorization: Bearer {access_token}
```

**درخواست:**
```json
{
  "rush_fee_amount": 75000,
  "rush_fee_percentage": 15
}
```

---

### 3. الگوهای تحویل
```
GET /api/order/delivery-templates/
Authorization: Bearer {access_token}
```

---

### 4. ارتقاء الگوی تحویل
```
PUT /api/order/delivery-templates/{id}/update/
Authorization: Bearer {access_token}
```

---

### 5. بررسی ظرفیت
```
POST /api/order/check-capacity/
Authorization: Bearer {access_token}
```

**درخواست:**
```json
{
  "date": "2026-08-15",
  "time_slot": "10:00-12:00"
}
```

---

### 6. تأیید سفارش
```
POST /api/order/validate-order/
Authorization: Bearer {access_token}
```

---

### 7. زمان‌های انتخاب
```
GET /api/order/pickup-times/
```

---

### 8. زمان‌های تحویل
```
GET /api/order/delivery-times/
```

---

## 📍 آدرس‌ها

### 1. ایجاد آدرس جدید
```
POST /api/order/address/create/
Authorization: Bearer {access_token}
```

**درخواست:**
```json
{
  "title": "خانه",
  "province": "تهران",
  "city": "تهران",
  "district": "فردیس",
  "street": "خیابان آزادی",
  "alley": "کوچه دوم",
  "plaque": "15",
  "latitude": 35.7895,
  "longitude": 51.4114,
  "description": "در آخر کوچه"
}
```

---

### 2. لیست آدرس‌های من
```
GET /api/order/address/list/
Authorization: Bearer {access_token}
```

---

### 3. بروزرسانی آدرس
```
PUT /api/order/address/update/{id}/
Authorization: Bearer {access_token}
```

---

### 4. حذف آدرس
```
DELETE /api/order/address/delete/{id}/
Authorization: Bearer {access_token}
```

---

### 5. جستجوی نشان (Neshan)
```
GET /api/order/neshan/search/?q=تهران
```

**پاسخ موفق (200):**
```json
{
  "results": [
    {
      "address": "تهران، خیابان آزادی",
      "latitude": 35.7895,
      "longitude": 51.4114
    }
  ]
}
```

---

### 6. جستجوی معکوس نشان (Reverse)
```
GET /api/order/neshan/reverse/?lat=35.7895&lng=51.4114
```

---

## 💳 تخفیف‌ها و کوپن

### 1. لیست تخفیف‌های محصول
```
GET /api/discounts/product-discounts/
Authorization: Bearer {access_token}
```

---

### 2. لیست تخفیف‌های عمومی
```
GET /api/discounts/global-discounts/
Authorization: Bearer {access_token}
```

---

### 3. لیست کوپن‌ها
```
GET /api/discounts/coupons/
Authorization: Bearer {access_token}
```

---

### 4. ایجاد کوپن جدید
```
POST /api/discounts/coupons/
Authorization: Bearer {access_token}
```

**درخواست:**
```json
{
  "code": "SUMMER2026",
  "discount_type": "percentage",
  "discount_value": 20,
  "max_uses": 100,
  "expiration_date": "2026-12-31"
}
```

---

## 🔔 اعلان‌ها

### 1. لیست اعلان‌ها
```
GET /api/notifications/notif_urls/
Authorization: Bearer {access_token}
```

---

### 2. تاریخچه اعلان‌ها
```
GET /api/notifications/history_urls/
Authorization: Bearer {access_token}
```

---

### 3. ارسال SMS
```
POST /api/notifications/send_sms_urls/
Authorization: Bearer {access_token}
```

**درخواست:**
```json
{
  "phone": "09123456789",
  "message": "متن پیام"
}
```

---

## 💰 کیف پول

### 1. جریان پرداخت
```
POST /api/wallet/payment/
Authorization: Bearer {access_token}
```

**درخواست:**
```json
{
  "amount": 100000
}
```

---

### 2. اطلاعات OAuth
```
GET /api/wallet/oauth/
```

---

## 📊 گزارش‌ها

### 1. بالاترین خدمات
```
GET /api/report/analytics/top-services/
Authorization: Bearer {access_token}
```

---

### 2. بالاترین مشتریان
```
GET /api/report/analytics/top-customers/
Authorization: Bearer {access_token}
```

---

### 3. مشتریان بدون سفارش
```
GET /api/report/analytics/customers/no-orders/
Authorization: Bearer {access_token}
```

---

### 4. لیست مشتریان (گزارش)
```
GET /api/report/customers/
Authorization: Bearer {access_token}
```

---

### 5. جستجوی مشتری (گزارش)
```
GET /api/report/customers/search/?q=نام
Authorization: Bearer {access_token}
```

---

### 6. جزئیات مشتری (گزارش)
```
GET /api/report/customers/{id}/
Authorization: Bearer {access_token}
```

---

### 7. جزئیات کیف پول
```
GET /api/report/wallet/{user_id}/
Authorization: Bearer {access_token}
```

---

### 8. داشبورد اصلی
```
GET /api/report/dashboard/
Authorization: Bearer {access_token}
```

**پاسخ موفق (200):**
```json
{
  "total_orders": 1250,
  "today_orders": 45,
  "pending_orders": 12,
  "revenue": 5000000,
  "active_customers": 890
}
```

---

### 9. جزئیات سفارش
```
GET /api/report/orders/{id}/
Authorization: Bearer {access_token}
```

---

### 10. سفارش‌های امروز
```
GET /api/report/orders/today/
Authorization: Bearer {access_token}
```

---

### 11. توزیع وضعیت سفارش‌ها
```
GET /api/report/orders/status-distribution/
Authorization: Bearer {access_token}
```

**پاسخ موفق (200):**
```json
{
  "paid": 450,
  "washing": 120,
  "delivered": 800,
  "canceled": 50,
  "returned": 30
}
```

---

### 12. لیست سفارش‌ها (گزارش)
```
GET /api/report/orders/
Authorization: Bearer {access_token}
```

---

### 13. گزارش قیمت ماهانه
```
GET /api/report/monthly/price/{year}/{month}/
Authorization: Bearer {access_token}
```

---

### 14. گزارش تعداد سفارش ماهانه
```
GET /api/report/monthly/count/{year}/{month}/
Authorization: Bearer {access_token}
```

---

### 15. گزارش درآمد
```
GET /api/report/income/
Authorization: Bearer {access_token}
```

---

### 16. گزارش فروش هفتگی
```
GET /api/report/weekly/sales/{year}/{month}/
Authorization: Bearer {access_token}
```

---

### 17. گزارش سفارش‌های هفتگی
```
GET /api/report/weekly/orders/{year}/{month}/
Authorization: Bearer {access_token}
```

---

### 18. گزارش عملکرد تحویل
```
GET /api/report/delivery-performance/
Authorization: Bearer {access_token}
```

---

### 19. صادر کردن گزارش درآمد به Excel
```
GET /api/report/export/income-excel/
Authorization: Bearer {access_token}
```

---

### 20. گزارش کل سفارش‌ها
```
GET /api/report/total-orders/
Authorization: Bearer {access_token}
```

---

## 🎫 بلیط‌های پشتیبانی

### 1. ایجاد بلیط جدید
```
POST /api/tickets/
Authorization: Bearer {access_token}
```

**درخواست:**
```json
{
  "title": "مشکل در سفارش",
  "description": "سفارش من حدف شد",
  "priority": "high"
}
```

---

### 2. لیست بلیط‌های من
```
GET /api/tickets/
Authorization: Bearer {access_token}
```

---

### 3. جزئیات بلیط
```
GET /api/tickets/{id}/
Authorization: Bearer {access_token}
```

---

### 4. اضافه کردن پیام به بلیط
```
POST /api/tickets/{id}/messages/
Authorization: Bearer {access_token}
```

**درخواست:**
```json
{
  "message": "ببخشید، هنوز مشکل حل نشده"
}
```

---

### 5. لیست بلیط‌های ادمین
```
GET /api/admin/tickets/
Authorization: Bearer {access_token}
```

---

### 6. پاسخ به بلیط (ادمین)
```
POST /api/admin/tickets/{id}/reply/
Authorization: Bearer {access_token}
```

**درخواست:**
```json
{
  "reply": "ما برای حل مشکل شما اقدام کردیم"
}
```

---

## 🔑 توضیحات کلی

### Authorization Header
تمام درخواست‌های محدود به یک header نیاز دارند:
```
Authorization: Bearer {access_token}
```

### Error Responses
```json
{
  "detail": "توضیح خطا",
  "error_code": "ERROR_CODE"
}
```

### Status Codes
- `200` - درخواست موفق
- `201` - منبع ایجاد شد
- `204` - موفق بدون محتوا
- `400` - درخواست نامعتبر
- `401` - احراز هویت مورد نیاز
- `403` - دسترسی رد شد
- `404` - منبع یافت نشد
- `500` - خطای سرور

---

## 📞 تماس و پشتیبانی

برای سؤالات و مشکلات، لطفاً از بخش بلیط‌های پشتیبانی استفاده کنید.

---

**نوشته شده توسط:** تیم توسعه Bokhar  
**آخرین بروزرسانی:** 2026-08-13
