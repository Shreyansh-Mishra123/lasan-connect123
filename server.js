require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const GitHubStrategy = require('passport-github2').Strategy;
const AppleStrategy = require('passport-apple');

const app = express();
const upload = multer({ dest: 'uploads/' });

passport.use(new GitHubStrategy({
    clientID: 'YOUR_GITHUB_CLIENT_ID',
    clientSecret: 'YOUR_GITHUB_CLIENT_SECRET',
    callbackURL: "http://localhost:5000/api/auth/github/callback"
}, (accessToken, refreshToken, profile, cb) => {
    // Check/Create user in your users table (same as Google logic)
    return cb(null, profile);
}));


// NOTE: Apple requires a teamID, keyID, and a .p8 private key file
passport.use(new AppleStrategy({
    clientID: 'YOUR_APPLE_SERVICE_ID',
    teamID: 'YOUR_APPLE_TEAM_ID',
    callbackURL: "http://localhost:5000/api/auth/apple/callback",
    keyID: 'YOUR_APPLE_KEY_ID',
    privateKeyLocation: path.join(__dirname, 'AuthKey.p8'),
    passReqToCallback: true
}, (req, accessToken, refreshToken, idToken, profile, cb) => {
    return cb(null, profile);
}));

// --- MIDDLEWARE ---
app.use(cors({ origin: 'http://localhost:5000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'LASAN_PORTAL_CORE_SECRET_KEY',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

// --- GOOGLE STRATEGY ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/api/auth/google/callback"
}, (accessToken, refreshToken, profile, cb) => cb(null, profile)));

// LOOK HERE: This is where they are located in your code
passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((obj, cb) => cb(null, obj));

// --- DATABASE ---
const db = new sqlite3.Database(path.join(__dirname, 'lasan_portal.db'));

// --- GITHUB ROUTES ---
app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/api/auth/github/callback', 
    passport.authenticate('github', { failureRedirect: '/index.html' }),
    (req, res) => res.redirect('/store.html')
);

// --- APPLE ROUTES ---
app.get('/api/auth/apple', passport.authenticate('apple'));

app.post('/api/auth/apple/callback', 
    passport.authenticate('apple', { failureRedirect: '/index.html' }),
    (req, res) => res.redirect('/store.html')
);


// --- DATABASE ---
const db = new sqlite3.Database(path.join(__dirname, 'lasan_portal.db'));
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, role TEXT DEFAULT 'student')`);
    db.run(`CREATE TABLE IF NOT EXISTS materials (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, subject TEXT, category TEXT, variant TEXT, price TEXT, fileUrl TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS purchases (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, materialId TEXT)`);
});

// --- AUTH ROUTES ---
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/index.html' }),
    (req, res) => {
        const email = req.user.emails[0].value;
        db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
            if (!user) {
                db.run(`INSERT INTO users (email, role) VALUES (?, 'student')`, [email], () => res.redirect('/store.html'));
            } else {
                res.redirect('/store.html');
            }
        });
    }
);

app.get('/api/check-session', (req, res) => {
    if (req.isAuthenticated()) res.status(200).json({ loggedIn: true });
    else res.status(401).json({ loggedIn: false });
});

app.get('/api/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/index.html');
    });
});

// --- API ROUTES ---
app.post('/api/auth/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin_root' && password === 'password123') {
        res.json({ 
            success: true, 
            token: 'dummy-admin-token-123', 
            username: username, 
            role: 'admin' 
        }); // Make sure this closing bracket and parenthesis are here!
    } else {
        res.status(401).json({ success: false, message: 'Invalid clearance credentials.' });
    }
});

app.get('/api/materials', (req, res) => {
    db.all(`SELECT * FROM materials`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/materials', upload.single('materialFile'), (req, res) => {
    const { title, subject, category, variant, price } = req.body;
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = `INSERT INTO materials (title, subject, category, variant, price, fileUrl) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [title, subject, category, variant, price, fileUrl], function(err) {
        if (err) {
            return res.status(500).json({ message: "Database error: " + err.message });
        }
        res.json({ success: true, id: this.lastID });
    });
});

app.get('/api/user-library', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json([]);
    const email = req.user.emails[0].value;
    db.all(`SELECT m.* FROM materials m JOIN purchases p ON m.id = p.materialId JOIN users u ON u.id = p.user_id WHERE u.email = ?`, [email], (err, rows) => res.json(rows || []));
});

// --- CATCH-ALL (Must be last) ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(5000, () => console.log('📡 Server running on http://localhost:5000'));