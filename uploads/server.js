// 1. TOP-LEVEL EMERGENCY EXCEPTION HANDLERS
process.on('uncaughtException', (err) => {
    console.error("\n💥 CRITICAL PROCESS EXCEPTION DETECTED!");
    console.error("Message:", err.message);
    console.error("Stack Trace:\n", err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error("\n💥 UNHANDLED PROMISE REJECTION REASON:", reason);
});

console.log("========================================");
console.log("🔄 INITIATING LASAN REVISION ENGINE...");
console.log("========================================");

// 2. CORE MODULE IMPORTS WITH LOG TRACKING
console.log("⏳ Loading Express framework...");
const express = require('express');

console.log("⏳ Loading Mongoose ORM...");
const mongoose = require('mongoose');

console.log("⏳ Loading Multer file processor...");
const multer = require('multer');

console.log("⏳ Loading system path utilities...");
const path = require('path');

console.log("⏳ Loading CORS filters...");
const cors = require('cors');

console.log("📦 Core Node modules loaded cleanly.");

// 3. SCHEMA IMPORT
console.log("⏳ Requiring Material database schema...");
const Material = require('./models/Material');
console.log("📋 Database Schema loaded successfully.");

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

console.log("🌐 Static routers and public assets mounted.");

// --- DATABASE CONNECTION ---
console.log("⏳ Attempting connection to MongoDB...");
mongoose.connect('mongodb://127.0.0.1:27017/lasan-revision', {
    serverSelectionTimeoutMS: 5000
})
.then(() => console.log('✅ Connected to MongoDB Database Collection Successfully.'))
.catch((err) => {
    console.error('❌ MongoDB Connection Failure!');
    console.error('Ensure MongoDB Community Server is installed and running in Services.');
    console.error(err.message);
});

// --- MULTER STORAGE CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads/materials'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const dynamicName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
        cb(null, `${uniqueSuffix}-${dynamicName}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Rejected: Only PDF files (.pdf) are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 25 * 1024 * 1024 }
});

// --- REST API ENDPOINTS ---

// Upload Past Paper Material
app.post('/api/materials/upload', upload.single('materialFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('<h3>Error: Missing upload file.</h3>');
        
        const newPastPaper = new Material({
            title: req.body.title,
            curriculum: req.body.curriculum,
            examBoard: req.body.examBoard,
            subject: req.body.subject,
            year: Number(req.body.year),
            paperSession: req.body.paperSession,
            price: Number(req.body.price),
            description: req.body.description,
            filePath: `/uploads/materials/${req.file.filename}`
        });

        await newPastPaper.save();
        res.redirect('/admin-dashboard.html');
    } catch (error) {
        console.error('❌ Upload Controller Error:', error);
        res.status(500).send(`Server Error: ${error.message}`);
    }
});

// Fetch Store Inventory API
app.get('/api/materials', async (req, res) => {
    try {
        const list = await Material.find().sort({ createdAt: -1 });
        res.status(200).json(list);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Past Paper Resource
app.delete('/api/materials/:id', async (req, res) => {
    try {
        await Material.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Resource cleared.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- START ROUTER ENGINE ---
app.listen(PORT, () => {
    console.log(`\n🚀 SUCCESS! Lasan Hub Engine live at: http://localhost:${PORT}`);
});