require('dotenv').config();

const mongoose = require("mongoose");

function connectDatabase(params) {
    return mongoose.connect(process.env.DB_LINK);
}

module.exports = {
    connectDatabase
};