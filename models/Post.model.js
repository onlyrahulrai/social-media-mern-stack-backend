const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  title: { type: String },
  description: {
    type: Object,
    required: true,
  },
  photo: {
    type: String,
    required: false,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment"
    },
  ],
  created_at: { type: Date, required: true, default: Date.now },
  updated_at: { type: Date, required: true, default: new Date() },
});

const PostModel = mongoose.model("Post", PostSchema);

module.exports = PostModel;
