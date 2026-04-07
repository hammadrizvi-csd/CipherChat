const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");

const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const chatController = require("../controllers/chatController");

// Auth Routes
router.post("/send-otp", authController.sendOtp);
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.delete("/delete-account", authController.deleteAccount);

// User Routes
router.get("/user-profile/:handle", userController.getUserProfile);
router.put("/update-profile", userController.updateProfile);
router.post("/upload-dp/:handle", upload.single("dp"), userController.uploadDp);
router.get("/users", userController.getAllUsers);

// Chat Routes
router.get("/messages/:user1/:user2", chatController.getMessages);
router.post("/upload-file", upload.single("file"), chatController.uploadFile);
// 🔥 NAYA: Delete Chat Route
router.delete("/delete-chat/:user1/:user2", chatController.deleteChatHistory);

module.exports = router;