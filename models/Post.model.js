const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const PostSchema = new mongoose.Schema({
  title: { type: String },
  description: {
    type: Object,
    required: true,
  },
  categories: [
    {
      label: String,
      value: String,
    },
  ],
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
      ref: "Comment",
    },
  ],
  created_at: { type: Date, required: true, default: Date.now },
  updated_at: { type: Date, required: true, default: new Date() },
});

PostSchema.plugin(mongoosePaginate);

const PostModel = mongoose.model("Post", PostSchema);

module.exports = PostModel;
