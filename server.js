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
mongoose.connect("mongodb://username:password@ac-qcxxumt-shard-00-00.ovirt6j.mongodb.net:27017,ac-qcxxumt-shard-00-01.ovirt6j.mongodb.net:27017,ac-qcxxumt-shard-00-02.ovirt6j.mongodb.net:27017/?ssl=true&replicaSet=atlas-4l2eaz-shard-0&authSource=admin&appName=CipherChat")
.then(() => console.log("MongoDB connected ✅"))
.catch(err => console.log("DB error:", err));

const PORT = 4000;
server.listen(PORT, "0.0.0.0", () => { console.log(`Server running at http://localhost:${PORT}`); });
