const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  chat:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Chat"
  },
  message: {
    type: String,
  },
  file: {
    type: String,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Please provide sender Id"],
  },
  read: {
    type: Boolean,
    default: false,
  }
},{timestamps:true});

module.exports = mongoose.model("Message",MessageSchema);