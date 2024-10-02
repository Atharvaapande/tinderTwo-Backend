const mongoose = require("mongoose");

const peopleSchema = new mongoose.Schema({
  phone: String,
  firstName: String,
  lastName: String,
  age: String,
  occupation: String,
  photoURL: String,
  pass: [],
  match: [
    {
      matchID: String,
      matchFirstName: String,
      matchLastName: String,
      matchPhotoURL: String,
      conversationID: String,
    },
  ],
});

const peopleModel = mongoose.model("people", peopleSchema);
module.exports = peopleModel;
