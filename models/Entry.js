const mongoose = require("mongoose");

const EntrySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    day: {
        type:String,
        required: true
    },
    month: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    }
});

const Entry = new mongoose.model("Entry",EntrySchema);


module.exports.Entry = Entry;