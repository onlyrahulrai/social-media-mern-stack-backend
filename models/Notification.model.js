const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["follow", "post", "like", "comment"],
  },
  read: {
    type: Boolean,
    default: false,
  },
  post: {
    ref: "Post",
    type: mongoose.Schema.Types.ObjectId,
  },
  created_by: {
    ref: "User",
    type: mongoose.Schema.Types.ObjectId,
  },
  created_for: [
    {
      ref: "User",
      type: mongoose.Schema.Types.ObjectId,
    },
  ],
  created_at: {
    type: Date,
    required: true,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    required: true,
    default: new Date(),
  },
});

module.exports = mongoose.model("Notification", NotificationSchema);
