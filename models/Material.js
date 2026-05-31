const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true, 
        trim: true 
    },
    curriculum: { 
        type: String, 
        required: true,
        enum: ['KCSE', 'IGCSE', 'IAS', 'IAL', 'IB']
    },
    examBoard: { 
        type: String, 
        required: true 
    },
    subject: { 
        type: String, 
        required: true 
    },
    year: { 
        type: Number, 
        required: true 
    },
    paperSession: { 
        type: String, 
        required: true 
    },
    price: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    description: { 
        type: String, 
        trim: true 
    },
    filePath: { 
        type: String, 
        required: true 
    },
    salesCount: { 
        type: Number, 
        default: 0 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Enforce single compilation safety barrier
module.exports = mongoose.models.Material || mongoose.model('Material', MaterialSchema);