const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    text: { type: String, default: "" }, 
    fileUrl: { type: String, default: "" }, 
    fileName: { type: String, default: "" },
    // 🔥 NAYA: Message Status field
    status: { type: String, default: "sent" }, 
    timestamp: { type: Date, default: Date.now } 
});

module.exports = mongoose.model("Message", messageSchema);