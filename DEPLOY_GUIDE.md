# 🚀 Phase 3: Setup, Configuration & Deployment Guide

Is document mein humne naya database connect karne, OTP system set karne aur project ko live (ngrok) karne ka poora process bataya hai.

---

## 1️⃣ Naya Google OTP Setup (Nodemailer)
Agar aap apni Gmail ID change kar rahe hain, toh ye steps follow karein:

* **App Password**: Apni Gmail ID mein '2-Step Verification' on karein aur Google se 16-digit ka 'App Password' generate karein.
* **Code Update**: `server.js` mein niche diye gaye hisse ko update karein:

```javascript
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { 
        user: "YOUR_NEW_GMAIL@gmail.com", 
        pass: "YOUR_16_DIGIT_APP_PASSWORD" 
    }
});
