const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 1. Standalone schema definition matching your User model requirements
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        default: 'student'
    }
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

const User = mongoose.model('User_Seed', UserSchema, 'users');

// 2. Database cloud injection engine execution block
const seedSystemProfiles = async () => {
    // Matched directly to your live MongoDB Atlas cloud network cluster string
    const ATLAS_URI = 'mongodb+srv://admin12:admin1234@cluster0.9rve3jf.mongodb.net/lasan-revision?retryWrites=true&w=majority&appName=Cluster0';
    
    try {
        console.log('Connecting directly to MongoDB Atlas Cloud Cluster...');
        await mongoose.connect(ATLAS_URI);
        console.log('✅ Connection established safely.');
        
        // Wipe matching legacy root user instances to prevent index collisions
        await User.deleteOne({ username: 'admin_root' });
        
        const systemAdmin = new User({
            username: 'admin_root',
            password: 'TYPESHIT', 
            role: 'admin'
        });

        await systemAdmin.save();
        
        console.log('\n=========================================');
        console.log('--- SYSTEM CONFIGURATION SEED COMPLETE ---');
        console.log('STATUS: Admin profile dropped into Atlas Cloud!');
        console.log('USERNAME: admin_root');
        console.log('PASSWORD: TYPESHIT');
        console.log('CLEARANCE PROFILE TIER: admin');
        console.log('=========================================\n');
        
    } catch (error) {
        console.error('CRITICAL: Cloud generation failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

seedSystemProfiles();