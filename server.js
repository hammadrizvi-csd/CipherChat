require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");

// Imports Routes & Socket Handler
const apiRoutes = require("./routes/apiRoutes");
const socketHandler = require("./socket/socketHandler");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🔥 PRO TRICK: Controllers ko Socket.io ka access dene ke liye
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Saare APIs is router se handle honge
app.use("/", apiRoutes);

// Default Route
app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "public", "index.html")); });

// Socket.io ka Logic
socketHandler(io);

// Database Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected ✅"))
.catch(err => console.log("DB error:", err));

const PORT = 4000;
server.listen(PORT, "0.0.0.0", () => { console.log(`Server running at http://localhost:${PORT}`); });
