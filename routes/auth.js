const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { verifyAdminToken, JWT_SECRET } = require('../middleware/auth');

/**
 * @route   POST /api/auth/admin-login
 * @desc    Root administrative login signature generator
 */
router.post('/admin-login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const adminUser = await User.findOne({ username: username.toLowerCase() });
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(401).json({ message: "Invalid administrator credentials." });
        }

        const passesCheck = await bcrypt.compare(password, adminUser.password);
        if (!passesCheck) {
            return res.status(401).json({ message: "Invalid administrator credentials." });
        }

        const token = jwt.sign(
            { id: adminUser._id, username: adminUser.username, role: adminUser.role },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({ token, username: adminUser.username, role: adminUser.role });
    } catch (err) {
        res.status(500).json({ message: "Server error during handshake authentication." });
    }
});

/**
 * @route   GET /api/auth/users
 * @desc    Fetch all registered profiles
 */
router.get('/users', verifyAdminToken, async (req, res) => {
    try {
        const users = await User.find({}).select('username role _id');
        res.status(200).json(users);
    } catch (error) {
        console.error("Database alignment error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

/**
 * @route   POST /api/auth/register-user
 * @desc    Provision a brand new user
 */
router.post('/register-user', verifyAdminToken, async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required." });
    }

    try {
        const profileCollisionCheck = await User.findOne({ username: username.toLowerCase() });
        if (profileCollisionCheck) {
            return res.status(400).json({ message: "Username already exists." });
        }

        // FIX: Hash password before saving to the database
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username: username.trim().toLowerCase(),
            password: hashedPassword,
            role: role || 'student'
        });

        await newUser.save();
        res.status(201).json({ message: "Profile registered successfully." });
    } catch (err) {
        res.status(500).json({ message: "Failed to construct system profile." });
    }
});

module.exports = router;