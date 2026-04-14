const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const otpStore = {}; // Temporary OTP memory

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: "cipherchat.teamx@gmail.com", pass: "qknqelpdwghlqllu" }
});

exports.sendOtp = async (req, res) => {
    try {
        const { email, mobile } = req.body;
        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ message: "This Email is already registered! Please Login." });
        if (mobile) {
            const existingMobile = await User.findOne({ mobile });
            if (existingMobile) return res.status(400).json({ message: "This Mobile Number is already registered!" });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = otp; 
        await transporter.sendMail({
            from: "cipherchat.teamx@gmail.com", to: email, subject: "Chatify - Verification OTP",
            html: `<h3>Welcome to Chatify!</h3><p>Your OTP is: <b style="font-size:20px; color:#00a884;">${otp}</b></p>`
        });
        res.status(200).json({ message: "OTP sent successfully!" });
    } catch (error) { res.status(500).json({ message: "Failed to send OTP." }); }
};

exports.signup = async (req, res) => {
    try {
        const { fullName, email, mobile, password, userOtp } = req.body;
        if (otpStore[email] !== userOtp) return res.status(400).json({ message: "Invalid or Expired OTP!" });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const uniqueHandle = fullName.replace(/\s+/g, '').toLowerCase() + "_" + Math.floor(1000 + Math.random() * 9000);
        
        const userData = { email, password: hashedPassword, displayName: fullName, uniqueHandle };
        if (mobile && mobile.trim() !== "") userData.mobile = mobile;

        const newUser = new User(userData);
        await newUser.save();
        delete otpStore[email];
        res.status(201).json({ message: "Signup successful" });
    } catch (err) { res.status(500).json({ message: "Signup error" }); }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Wrong password" });
        const token = jwt.sign({ handle: user.uniqueHandle }, "secretkey123", { expiresIn: "7d" });
        res.json({ message: "Login successful", token, displayName: user.displayName, uniqueHandle: user.uniqueHandle });
    } catch (err) { res.status(500).json({ message: "Login error" }); }
};

exports.deleteAccount = async (req, res) => {
    try {
        await User.findOneAndDelete({ uniqueHandle: req.body.handle });
        res.status(200).json({ message: "Account deleted forever." });
    } catch (err) { res.status(500).json({ message: "Error deleting account" }); }
};