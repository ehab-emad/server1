const express = require('express');
const app = express();
const cors = require('cors'); // استيراد مكتبة CORS
const port = process.env.PORT || 3000;
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

app.use(express.json()); // لدعم JSON في الطلبات
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  next();
});

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

// إضافة صورة جديدة
app.post('/images', async (req, res) => {
  const { title, url } = req.body;

  if (!title || !url) {
    return res.status(400).json({ error: 'Title and URL are required' });
  }

  try {
    let db = {};
    if (fs.existsSync(dbFilePath)) {
      db = JSON.parse(fs.readFileSync(dbFilePath));
    } else {
      db = { images: [] };
    }

    db.images.push({
      id: db.images.length + 1, // تعيين ID جديد
      title,
      url
    });

    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2));

    res.status(201).json({ message: 'Image added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error adding image' });
  }
});

// حذف صورة
app.delete('/images/:id', async (req, res) => {
  const { id } = req.params;

  try {
    let db = {};
    if (fs.existsSync(dbFilePath)) {
      db = JSON.parse(fs.readFileSync(dbFilePath));
    } else {
      db = { images: [] };
    }

    const imageIndex = db.images.findIndex(image => image.id === parseInt(id));
    
    if (imageIndex === -1) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = db.images[imageIndex];
    
    // حذف الصورة من Cloudinary
    cloudinary.uploader.destroy(image.title, (error, result) => {
      if (error) {
        console.error(`Cloudinary error: ${error.message}`);
        return res.status(500).json({ error: 'Error deleting image from Cloudinary' });
      }

      // حذف الصورة من db.json
      db.images.splice(imageIndex, 1);
      fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2));

      res.json({ message: 'Image deleted successfully' });
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Error deleting image' });
  }
});

// جلب صورة بناءً على ID
app.get('/images/:id', (req, res) => {
  const { id } = req.params;

  try {
    let db = {};
    if (fs.existsSync(dbFilePath)) {
      db = JSON.parse(fs.readFileSync(dbFilePath));
    } else {
      db = { images: [] };
    }

    const image = db.images.find(img => img.id === parseInt(id));

    if (image) {
      res.json(image);
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching image' });
  }
});

// بدء تشغيل الخادم
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
