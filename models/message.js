const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  chat: [
    {
      sender: String, // Sender's name or ID
      receiver: String, // Receiver's name or ID
      content: String, // Message text
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const Message = mongoose.model("messages", messageSchema);
module.exports = Message;
