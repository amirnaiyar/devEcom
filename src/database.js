const mongoose = require("mongoose")
const dotenv = require("dotenv")
dotenv.config()

const DBConnection = mongoose.connect(process.env.DB_URL + 'nodeEcom')

module.exports = DBConnection