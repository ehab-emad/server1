const express = require('express');
const app = express();
const cors = require('cors'); // استيراد مكتبة CORS
const port = process.env.PORT || 3000;
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// إعدادات Cloudinary
cloudinary.config({
  cloud_name: 'dxtbsifqn',
  api_key: '554486421733863',
  api_secret: 'B_wv1i5_3Jyi-ILLVYZhZrgvym8'
});

// مسار ملف db.json
const dbFilePath = path.join(__dirname, 'db.json');

// دالة للحصول على قائمة الصور من Cloudinary
function fetchImageList() {
  return new Promise((resolve, reject) => {
    cloudinary.api.resources({ type: 'upload', max_results: 100 }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result.resources);
      }
    });
  });
}

// تحديث db.json بالصور
async function updateDbWithImages() {
  try {
    const images = await fetchImageList();

    // قراءة محتويات db.json
    let db = {};
    if (fs.existsSync(dbFilePath)) {
      db = JSON.parse(fs.readFileSync(dbFilePath));
    } else {
      db = { images: [] };
    }

    // إضافة الصور إلى db.json
    images.forEach(image => {
      db.images.push({
        id: db.images.length + 1, // تعيين ID جديد
        title: image.public_id,   // عنوان الصورة (يمكن تعديله حسب الحاجة)
        url: image.secure_url     // رابط الصورة
      });
    });

    // كتابة التحديثات إلى db.json
    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2));

    console.log('db.json updated with image URLs.');
  } catch (error) {
    console.error('Error updating db.json:', error);
  }
}

// تحديث db.json عند بدء التشغيل
updateDbWithImages();
app.use(cors());

// مسار الجذر /
app.get('/', (req, res) => {
  if (fs.existsSync(dbFilePath)) {
    res.sendFile(dbFilePath);
  } else {
    res.status(404).json({ error: 'db.json not found' });
  }
});

// قراءة ملف db.json وعرض الصور
app.get('/images', (req, res) => {
  if (fs.existsSync(dbFilePath)) {
    const db = JSON.parse(fs.readFileSync(dbFilePath));
    res.json(db.images);
  } else {
    res.status(404).json({ error: 'db.json not found' });
  }
});

// بدء تشغيل الخادم
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

