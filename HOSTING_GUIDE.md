# 🌟 دليل نشر واستضافة منصة ديوان السعادة – نغم يجمعنا

مرحباً بك في الدليل الشامل لنشر واستضافة المنصة الرقمية الرسمية لقناة **ديوان السعادة – نغم يجمعنا** على أي خادم سحابي أو استضافة خارجية (VPS، خوادم مخصصة، Docker، لوحات تحكم cPanel).

---

## 📋 المتطلبات الأساسية للنظام

- **Node.js**: الإصدار `v20.x` أو `v22.x` (LTS)
- **NPM** أو **Bun**: الإصدار الأحدث
- **الذاكرة العشوائية (RAM)**: 1GB كحد أدنى (مستحسن 2GB)
- **المساحة التخزينية**: 2GB فأكثر

---

## 🚀 الخيار الأول: النشر السريع عبر Docker (المستحسن والأسهل)

تم تجهيز التطبيق بملف `Dockerfile` وملف `docker-compose.yml` جاهزين للعمل بأمر واحد:

```bash
# 1. استنساخ المشروع أو فك ضغط الحزمة
cd dewan-alsaada

# 2. إنشاء ملف المتغيرات البيئية
cp .env.example .env

# 3. تشغيل الحاوية في الخلفية
docker compose up -d --build

# 4. التحقق من حالة التشغيل
docker compose ps
docker compose logs -f
```

التطبيق سيعمل فوراً على المنفذ `3000` مع حفظ قاعدة البيانات التلقائي في المجلد المحلي `./data/`.

---

## 💻 الخيار الثاني: النشر على سيرفر VPS (Hostinger / DigitalOcean / Ubuntu / Debian)

### 1. تثبيت المتطلبات وتحديث السيرفر

```bash
# تحديث الحزم
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git build-essential nginx

# تثبيت PM2 عالمياً لإدارة تشغيل التطبيق في الخلفية
sudo npm install -g pm2 tsx
```

### 2. تثبيت الحزم وبناء المشروع

```bash
# الانتقال لمجلد المشروع
cd /var/www/dewan-alsaada

# تثبيت الاعتماديات
npm install --legacy-peer-deps

# بناء واجهات المتصفح (Vite Production Build)
npm run build
```

### 3. إعداد المتغيرات البيئية (.env)

قم بإنشاء ملف `.env` وضبط المفاتيح:

```bash
nano .env
```

محتوى الملف المقترح:

```env
# منفذ الخادم
PORT=3000

# رابط الموقع المعتمد (مع النطاق الخاص بك)
APP_URL="https://dewanalsaada.com"

# مفتاح ذكاء اصطناعي Gemini AI (اختياري، يعمل أيضاً بدون مفتاح بنظام المعرفة المحلي السريع)
GEMINI_API_KEY=""

# رمز الدخول السري لإدارة المكتبة
LIBRARY_ACCESS_CODE="1#7a4"

# معرف قناة ديوان السعادة على يوتيوب
YOUTUBE_CHANNEL_ID="UC2XgHgOGcGcDJHjb7DkB2Mg"

# مفتاح YouTube Data API v3 (اختياري - النظام يسحب التحديثات تلقائياً عبر دفق RSS المباشر)
YOUTUBE_API_KEY=""
```

### 4. التشغيل عبر PM2 مع إعادة التشغيل التلقائي

```bash
# إنشاء مجلد السجلات
mkdir -p logs

# تشغيل التطبيق عبر ملف ecosystem.config.cjs
pm2 start ecosystem.config.cjs --env production

# حفظ قائمة التشغيل لتعمل تلقائياً عند إعادة تشغيل السيرفر
pm2 save
pm2 startup
```

---

## 🌐 ضبط خادم Nginx مع شهادة الأمان المجانية SSL (HTTPS)

### 1. إعداد تكوين Nginx Reverse Proxy

أنشئ ملف الإعداد:

```bash
sudo nano /etc/nginx/sites-available/dewanalsaada.com
```

ضع الكود التالي:

```nginx
server {
    server_name dewanalsaada.com www.dewanalsaada.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 300;
    }

    # دعم ملفات الفيديو والصوت الكبيرة بدفق 206 Partial Content
    location ~* \.(mp3|mp4|webm|ogg)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header Range $http_range;
        proxy_set_header If-Range $http_if_range;
        proxy_cache_bypass 1;
        proxy_no_cache 1;
    }
}
```

تفعيل الرابط واختبار الإعدادات:

```bash
sudo ln -s /etc/nginx/sites-available/dewanalsaada.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. تثبيت شهادة SSL مجانية عبر Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d dewanalsaada.com -d www.dewanalsaada.com
```

---

## 📦 الخيار الثالث: الاستضافة المشتركة (cPanel Node.js Selector)

إذا كانت استضافتك تدعم **Node.js Selector** في cPanel:
1. ارفع ملفات المشروع (أو الحزمة المضغوطة ZIP) إلى مجلد في السيرفر مثل `public_html/dewan`.
2. ادخل إلى **Setup Node.js App** في cPanel.
3. اختر إصدار Node.js `20.x` أو `22.x`.
4. حدد:
   - **Application root**: `dewan`
   - **Application startup file**: `server.ts`
5. اضغط على زر **Run NPM Install**.
6. شغّل أمر البناء `npm run build` من خلال الـ Terminal في cPanel.
7. اضغط **Restart Application**.

---

## 🔒 أمان البيانات والنسخ الاحتياطي التلقائي

- جميع فيديوهات القناة، الراديو المباشر، إحصائيات التنزيل، ومقامات الطرب محفوظة في ملف JSON آمن:
  `/data/database.json`
- يمكنك أخذ نسخة احتياطية من هذا الملف بأي وقت واسترجاعها فوراً.
- رمز الدخول لإدارة ومزامنة القناة محفوظ في متغير `LIBRARY_ACCESS_CODE`.
- تنزيل الحزمة البرمجية الكاملة محمي داخل لوحة التحكم الإدارية للمطور ولا يمكن للمستخدمين العاديين أو محاولات الدردشة الذكية الوصول إليه أو تسريبه.

---

🎶 **ديوان السعادة – نغم يجمعنا**  
منصة التراث والطرب الأصيل
