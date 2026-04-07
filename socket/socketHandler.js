const Message = require("../models/message");

module.exports = (io) => {
    const users = {}; 

    io.on("connection", (socket) => {
        socket.on("join", (handle) => { 
            users[handle] = socket.id; 
            io.emit("online_users", Object.keys(users)); 
        });
        
        socket.on("typing", ({ to, from }) => {
            const receiverSocket = users[to];
            if (receiverSocket) io.to(receiverSocket).emit("typing", { from });
        });

        socket.on("private message", async (data) => {
            try {
                const newMsg = new Message({ sender: data.from, receiver: data.to, text: data.message, fileUrl: data.fileUrl, fileName: data.fileName, timestamp: data.timestamp });
                const savedMsg = await newMsg.save();
                const receiverSocket = users[data.to];
                
                socket.emit("message_status", { msgId: data.msgId, status: "sent" });

                if (receiverSocket) {
                    io.to(receiverSocket).emit("private message", { ...data, dbId: savedMsg._id });
                    socket.emit("message_status", { msgId: data.msgId, status: "delivered" });
                }
            } catch (error) { console.error("Failed to save message:", error); }
        });

        socket.on("mark_read", async ({ from, to }) => {
            await Message.updateMany({ sender: from, receiver: to, status: { $ne: 'read' } }, { status: 'read' });
            const senderSocket = users[from];
            if (senderSocket) io.to(senderSocket).emit("messages_read", { by: to });
        });

        // 🔥 NAYA: Message Delete For Everyone Event
        socket.on("delete_message", async ({ msgId, to }) => {
            try {
                await Message.findByIdAndDelete(msgId); // DB se uda diya
                const receiverSocket = users[to];
                if (receiverSocket) io.to(receiverSocket).emit("message_deleted", { msgId }); // Receiver ki screen se udao
                socket.emit("message_deleted", { msgId }); // Bhejne wale ki screen se udao
            } catch (e) { console.error(e); }
        });

        socket.on("disconnect", () => {
            for (let user in users) {
                if (users[user] === socket.id) { 
                    delete users[user]; 
                    io.emit("online_users", Object.keys(users)); 
                    break; 
                }
            }
        });
    });
};