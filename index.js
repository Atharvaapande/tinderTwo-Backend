const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const peopleModel = require("./models/people");
const Message = require("./models/message");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (replace with your client URL in production)
  },
});

io.on("connection", (socket) => {
  console.log("User connected with socket ID:", socket.id);

  // Fetch all chat history on connection
  socket.on("fetchChatHistory", async (conversationID) => {
    const messages = await Message.findById(conversationID).sort({
      "chat.timestamp": 1,
    });
    socket.emit("chatHistory", messages);
  });

  // Send message logic
  socket.on("sendMessage", async ({ chatID, sender, receiver, content }) => {
    // Removed 'field' as it seems unnecessary for sending messages
    try {
      console.log(
        "Message received from",
        sender,
        "to",
        receiver,
        ": ",
        content
      );

      // Check if conversation already exists
      const newMessage = {
        sender,
        receiver,
        content,
        timestamp: new Date(),
      };

      // Update the conversation and add the new message
      const conversation = await Message.findByIdAndUpdate(
        chatID,
        {
          $addToSet: { chat: newMessage }, // Assuming 'chat' is the field to which messages are added
        },
        { new: true }
      );

      // Emit only the new message to all connected clients
      if (conversation) {
        io.emit("receiveMessage", newMessage); // Emit the last message sent
      } else {
        console.error("Conversation not found for chatID:", chatID);
      }
    } catch (error) {
      console.error("Error saving message to DB:", error);
    }
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});

// Use environment variable or hardcoded value for MongoDB URI
const mongoURI =
  process.env.MONGO_URI || "add your mongoDB API";

// Mongoose connection
mongoose.connect(mongoURI);

// Endpoint to get people
app.get("/people", (req, res) => {
  peopleModel
    .find(req.query)
    .then((people) => res.json(people))
    .catch((error) => res.status(500).json({ error: error.message }));
});

app.get("/user/:id", async (req, res) => {
  const userID = req.params.id;
  console.log(userID);
  const user = await peopleModel.findById(userID);
  res.send(user);
});

app.post("/saveData", async (req, res) => {
  const newUser = new peopleModel(req.body);
  const result = await newUser.save();
  res.send(result);
});

app.put("/updateExsistingMatch/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const matchID = req.body.value;
    const conversationID = req.body.conversationID;

    const matchToUpdate = await peopleModel.findById(id);

    matchToUpdate.match.map((item) => {
      if (item.matchID == matchID) {
        item.conversationID = conversationID;
      }
      return item;
    });
    await matchToUpdate.save();
    if (matchToUpdate) {
      return res.status(200).json({
        message: "Match updated successfully",
      });
    } else {
      return res.status(404).json({ message: "Match not found" });
    }
  } catch (error) {
    console.log("error while updating existing match", error);
  }
});

app.put("/updateData/:id", async (req, res) => {
  try {
    const userID = req.params.id;
    const userBody = req.body;
    const updateField = req.body.field;
    const matchID = req.body.value;
    const matchFirstName = req.body.matchFirstName;
    const matchLastName = req.body.matchLastName;
    const matchPhotoURL = req.body.matchPhotoURL;
    const conversationID = req.body.conversationID;
    if (updateField === "pass" || updateField === "match") {
      const updatePassOrMatch = await peopleModel.findByIdAndUpdate(
        userID,
        {
          $addToSet: {
            [updateField]: {
              matchID,
              matchFirstName,
              matchLastName,
              matchPhotoURL,
              conversationID,
            },
          },
        },
        { new: true }
      );
      if (updatePassOrMatch) {
        return res.status(200).json({
          message: "User updated successfully",
          user: updatePassOrMatch,
        });
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    } else {
      const user = await peopleModel.findById(userID);

      if (user) {
        user.firstName = userBody.firstName;
        user.lastName = userBody.lastName;
        user.age = userBody.age;
        user.occupation = userBody.occupation;
        user.photoURL = userBody.photoURL;

        const updatedUser = await user.save();
        if (updatedUser) {
          return res.status(200).json({
            message: "User updated successfully",
          });
        } else {
          return res.status(404).json({ message: "User not found" });
        }
      } else {
        console.log("error while updating, user is not found");
      }
    }
  } catch (error) {
    console.log("error occured before entering try", error);
  }
});

app.get("/matchFound/:id", async (req, res) => {
  const swipedUserID = req.params.id;
  const { ObjectId } = require("mongoose").Types;
  if (ObjectId.isValid(swipedUserID)) {
    const getSwipedUser = await peopleModel.findById(swipedUserID);
    res.send(getSwipedUser);
  } else {
    console.error("Invalid ObjectId:", swipedUserID);
  }
});

app.get("/getUser/:phone", async (req, res) => {
  const phone = req.params.phone;
  const query = { phone: phone };

  try {
    const user = await peopleModel.findOne(query);

    if (user) {
      // If the user is found, return the user data
      return res.status(200).json(user);
    } else {
      // If the user is not found, return a 404 error
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    // Handle any errors that might occur
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

//messages

app.post("/messages", async (req, res) => {
  const newConversation = new Message(req.body);
  const result = await newConversation.save();
  res.send(result);
});

app.get("/messages/:id", async (req, res) => {
  const conversationID = req.params.id;
  const conversation = await Message.findById(conversationID);
  res.send(conversation);
});

app.put("/sendMessages/:id", async (req, res) => {
  try {
    const conversationID = req.params.id;
    const value = req.body.value;
    const field = req.body.field;
    const find = await Message.findByIdAndUpdate(
      conversationID,
      {
        $addToSet: { [field]: value },
      },
      { new: true }
    );
    if (find) {
      return res.status(200).json({
        message: "User updated successfully",
        user: find,
      });
    } else {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.log("error while updating chats", error);
  }
});

// Server start
server.listen(3001, () => {
  console.log("Server running on port 3001");
});
