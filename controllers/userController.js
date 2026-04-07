const User = require("../models/user");

exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findOne({ uniqueHandle: req.params.handle });
        res.json({ email: user.email, mobile: user.mobile, age: user.age, profilePic: user.profilePic });
    } catch (err) { res.status(500).json({ message: "Error fetching profile" }); }
};

exports.updateProfile = async (req, res) => {
    try {
        const { handle, newName, age } = req.body;
        const updatedUser = await User.findOneAndUpdate({ uniqueHandle: handle }, { displayName: newName, age: age }, { returnDocument: 'after' });
        // req.io server.js se aayega global broadcast ke liye
        if(req.io) req.io.emit("user_updated", { handle: updatedUser.uniqueHandle, displayName: updatedUser.displayName, profilePic: updatedUser.profilePic });
        res.status(200).json({ message: "Profile updated successfully!" });
    } catch (err) { res.status(500).json({ message: "Error updating profile" }); }
};

exports.uploadDp = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        const dpUrl = "/uploads/" + req.file.filename;
        const updatedUser = await User.findOneAndUpdate({ uniqueHandle: req.params.handle }, { profilePic: dpUrl }, { returnDocument: 'after' });
        if(req.io) req.io.emit("user_updated", { handle: updatedUser.uniqueHandle, displayName: updatedUser.displayName, profilePic: updatedUser.profilePic });
        res.json({ profilePic: dpUrl });
    } catch (err) { res.status(500).json({ message: "Upload failed" }); }
};

exports.getAllUsers = async (req, res) => {
    try {
        const allUsers = await User.find({}, "uniqueHandle displayName profilePic -_id");
        res.json(allUsers);
    } catch (err) { res.status(500).json({ message: "Error fetching users" }); }
};