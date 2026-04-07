const Message = require("../models/message");

exports.getMessages = async (req, res) => {
    try {
        const history = await Message.find({
            $or: [{ sender: req.params.user1, receiver: req.params.user2 }, { sender: req.params.user2, receiver: req.params.user1 }]
        }).sort({ timestamp: 1 });
        res.json(history);
    } catch (err) { res.status(500).json({ message: "Error fetching history" }); }
};

exports.uploadFile = (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        res.json({ fileUrl: "/uploads/" + req.file.filename, fileName: req.file.originalname });
    } catch (err) { res.status(500).json({ message: "Upload failed" }); }
};

// 🔥 NAYA: Chat History Delete Karne ki API
exports.deleteChatHistory = async (req, res) => {
    try {
        const { user1, user2 } = req.params;
        await Message.deleteMany({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 }
            ]
        });
        res.status(200).json({ message: "Chat history deleted successfully." });
    } catch (err) { res.status(500).json({ message: "Error deleting chat history" }); }
};