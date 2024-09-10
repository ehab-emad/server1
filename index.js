const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// إعدادات Cloudinary
cloudinary.config({
  cloud_name: 'dmiugz4v6',
  api_key: '162966922949736',
  api_secret: 'LVnSbLArbqk7lTJvIIPweV-f6c0'
});

// إعداد Multer لرفع الملفات
const storage = multer.memoryStorage();
const upload = multer({ storage });

// مسار ملفات db
const dbFilePath = path.join(__dirname, 'db.json');
const backupFilePath = path.join(__dirname, 'db-backup.json');

// دالة للحصول على قائمة الصور من Cloudinary
async function fetchImageList() {
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

// دالة لعمل نسخة احتياطية
function backupDb() {
  if (fs.existsSync(dbFilePath)) {
    fs.copyFileSync(dbFilePath, backupFilePath);
    console.log('Backup created successfully.');
  } else {
    console.error('No db.json file found to backup.');
  }
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

    // تحديد أقصى ID موجود حالياً في db.json
    const maxId = db.images.reduce((max, image) => Math.max(max, image.id), 0);

    // إضافة الصور إلى db.json
    db.images = images.map((image, index) => ({
      id: maxId + index + 1, // تعيين ID جديد
      title: image.public_id,
      url: image.secure_url
    }));

    // كتابة التحديثات إلى db.json
    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2));
    backupDb(); // عمل نسخة احتياطية بعد التحديث

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
      id: db.images.length + 1,
      title,
      url
    });

    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2));
    backupDb(); // عمل نسخة احتياطية بعد التحديث

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
      backupDb(); // عمل نسخة احتياطية بعد التحديث

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

// رفع صورة إلى Cloudinary وتحديث db.json
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a file' });
  }

  // رفع الصورة إلى Cloudinary
  cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
    if (error) {
      console.error('Error uploading to Cloudinary:', error);
      return res.status(500).json({ error: 'Error uploading image to Cloudinary' });
    }

    // تحديث db.json بالصورة المرفوعة
    let db = {};
    if (fs.existsSync(dbFilePath)) {
      db = JSON.parse(fs.readFileSync(dbFilePath));
    } else {
      db = { images: [] };
    }

    db.images.push({
      id: db.images.length + 1, // تعيين ID جديد
      title: result.public_id,
      url: result.secure_url
    });

    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2));
    backupDb(); // عمل نسخة احتياطية بعد التحديث

    res.status(201).json({ message: 'Image uploaded and saved successfully', imageUrl: result.secure_url });
  }).end(req.file.buffer);
});

// بدء تشغيل الخادم
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  // عمل نسخة احتياطية عند بدء التشغيل
  backupDb();
});

// إيقاف السيرفر مع عمل نسخة احتياطية
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  backupDb();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  backupDb();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
