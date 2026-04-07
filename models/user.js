const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true }, 
    mobile: { type: String, unique: true, sparse: true }, 
    password: { type: String, required: true },
    displayName: { type: String, default: "User" }, 
    uniqueHandle: { type: String, unique: true },
    // 🔥 NAYA: DP aur Age ke columns
    age: { type: String, default: "" },
    profilePic: { type: String, default: "" } 
});

module.exports = mongoose.model("User", userSchema, "chat_users");