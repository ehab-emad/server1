const express = require('express');
const app = express();
const cors = require('cors'); // استيراد مكتبة CORS
const port = process.env.PORT || 3000;
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // مكتبة Multer لرفع الصور
const cron = require('node-cron'); // مكتبة cron للمهام الدورية

app.use(express.json()); // لدعم JSON في الطلبات
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  next();
});

// إعداد Multer لرفع الملفات
const storage = multer.memoryStorage();
const upload = multer({ storage });

// مسار ملف db.json
const dbFilePath = path.join(__dirname, 'db.json');

// إنشاء مجلد النسخ الاحتياطية
const backupFolderPath = path.join(__dirname, 'backup');
if (!fs.existsSync(backupFolderPath)) {
  fs.mkdirSync(backupFolderPath);
}

// دالة لإنشاء نسخة احتياطية
function createBackup() {
  const backupFileName = `db_backup_${Date.now()}.json`;
  const backupFilePath = path.join(backupFolderPath, backupFileName);

  if (fs.existsSync(dbFilePath)) {
    fs.copyFileSync(dbFilePath, backupFilePath);
    console.log(`Backup created: ${backupFileName}`);
  } else {
    console.log('db.json not found, no backup created.');
  }
}

// إعداد مهمة دورية للنسخ الاحتياطي كل 24 ساعة
cron.schedule('0 0 * * *', () => {
  console.log('Running daily backup...');
  createBackup();
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
app.post('/images', (req, res) => {
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
app.delete('/images/:id', (req, res) => {
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

    // حذف الصورة من db.json
    db.images.splice(imageIndex, 1);
    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2));

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Error deleting image' });
  }
});

// رفع صورة وتحديث db.json
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a file' });
  }

  // لتجنب رفع الصور إلى Cloudinary، نقوم مباشرة بتحديث db.json
  const imageUrl = `data:image/png;base64,${req.file.buffer.toString('base64')}`;

  try {
    let db = {};
    if (fs.existsSync(dbFilePath)) {
      db = JSON.parse(fs.readFileSync(dbFilePath));
    } else {
      db = { images: [] };
    }

    db.images.push({
      id: db.images.length + 1,
      title: req.file.originalname,
      url: imageUrl
    });

    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2));

    res.status(201).json({ message: 'Image uploaded and saved successfully', imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Error uploading image' });
  }
});

// بدء تشغيل الخادم
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
