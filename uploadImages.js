const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// إعدادات Cloudinary
cloudinary.config({
  cloud_name: 'dxtbsifqn',
  api_key: '554486421733863',
  api_secret: 'B_wv1i5_3Jyi-ILLVYZhZrgvym8'
});

// مسار ملف db.json
const dbFilePath = 'db.json';

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

// تشغيل دالة التحديث
updateDbWithImages();
