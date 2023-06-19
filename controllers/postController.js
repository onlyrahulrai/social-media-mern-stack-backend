const PostModel = require("../models/Post.model.js");
const UserModel = require("../models/User.model.js");
const CommentModel = require("../models/Comment.model.js");
const ReplyModel = require("../models/Reply.model.js");

exports.getPosts = async (req, res) => {
  await PostModel.find({})
    .sort({ created_at: "desc" })
    .populate("user")
    .then((posts) => {
      res.status(200).send({ posts });
    })
    .catch((error) => {
      res.status(500).send({ error });
    });
};

exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.user;
    await UserModel.findById({ _id: userId })
      .then((user) => {
        PostModel.find({ user: user._id })
          .then((posts) => {
            res.status(200).send(posts);
          })
          .catch((error) => {
            res.status(204).send({ error });
          });
      })
      .catch((error) => {
        res.status(204).send({ error });
      });
  } catch (error) {
    res.status(400).send({ error });
  }
};

exports.getPost = async (req, res) => {
  const { id } = req.params;
  await PostModel.findOne({ _id: id })
    .populate({
      path: "user",
      select: ["_id", "username", "firstName", "lastName", "profile"],
    })
    .populate({
      path: "comments",
      populate: [
        {
          path: "user",
          model: "User",
          select: ["_id", "username", "firstName", "lastName", "profile"],
        },
        {
          path: "replies",
          populate: [
            {
              path: "user",
              model: "User",
              select: ["_id", "username", "firstName", "lastName", "profile"],
            },
            {
              path: "replies",
              populate: [
                {
                  path: "user",
                  select: [
                    "_id",
                    "firstName",
                    "lastName",
                    "username",
                    "profile",
                  ],
                },
                {
                  path: "replies",
                  populate: [
                    {
                      path: "user",
                      select: [
                        "_id",
                        "firstName",
                        "lastName",
                        "username",
                        "profile",
                      ],
                    },
                    {
                      path: "replies",
                      populate: {
                        path: "user",
                        select: [
                          "_id",
                          "firstName",
                          "lastName",
                          "username",
                          "profile",
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    .then((post) => {
      if (!post)
        return res.status(404).send({ error: "Couldn't Find the post" });
      res.status(200).send(post);
    })
    .catch((error) => {
      res.status(500).send({ error });
    });
};

exports.createPost = async (req, res) => {
  const { title, description } = req.body;
  const { userId } = req.user;

  if (Boolean(title) && Boolean(description)) {
    const post = new PostModel({
      title,
      description,
      user: userId,
    });

    await post
      .save()
      .then((post) => {
        const { _id: id, ...rest } = Object.assign({}, post.toJSON());
        res.status(201).send({ id, ...rest });
      })
      .catch((error) => {
        res.status(500).send({ error });
      });
  }
};

exports.updatePost = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const body = req.body;
  await PostModel.findOneAndUpdate(
    { _id: id, user: userId },
    { $set: body },
    { new: true }
  )
    .then((post) => {
      const { _id: id, ...rest } = Object.assign({}, post.toJSON());
      res.status(202).send({ id, ...rest });
    })
    .catch((error) => {
      res.status(500).send({ error });
    });
};

exports.deletePost = async (req, res) => {
  const { id } = req.params;

  await PostModel.findByIdAndRemove({ _id: id })
    .then((result) => {
      res.status(202).send({ message: "Post deleted successfully" });
    })
    .catch((error) => {
      res.status(500).send({ error });
    });
};

exports.likePost = async (req, res) => {
  try {
    const { userId } = req.user;

    const { id: _id } = req.params;

    const post = await PostModel.findById({ _id });

    if (!post.likes.includes(userId)) {
      const post = await PostModel.findByIdAndUpdate(
        { _id },
        { $push: { likes: userId } },
        { new: true }
      );
      return res.status(200).json(post);
    } else {
      const post = await PostModel.findByIdAndUpdate(
        { _id },
        { $pull: { likes: userId } },
        { new: true }
      );
      return res.status(200).json(post);
    }
  } catch (error) {
    return res.status(500).send({ error });
  }
};

exports.commentPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const { userId: user } = req.user;

    const values = {
      user,
      content,
    };

    const comment = new CommentModel(values);

    await comment
      .save()
      .then(async (data) => {
        await PostModel.findByIdAndUpdate(
          id,
          {
            $push: { comments: data },
          },
          { new: true }
        )
          .select("comments")
          .populate({
            path: "comments",
            populate: [
              {
                path: "user",
                select: ["_id", "username", "firstName", "lastName", "profile"],
              },
              {
                path: "replies",
                populate: {
                  path: "user",
                  select: [
                    "_id",
                    "username",
                    "firstName",
                    "lastName",
                    "profile",
                  ],
                },
              },
            ],
          })
          .then(({ comments }) => {
            return res.status(202).send(comments);
          })
          .catch((error) => {
            return res.status(400).send(error);
          });
      })
      .catch((error) => {
        return res.status(400).send(error);
      });
  } catch (error) {
    return res.status(500).send(error);
  }
};

exports.replyComment = async (req, res) => {
  try {
    const { content, parent } = req.body;
    const { userId: user } = req.user;
    const { postId, commentId } = req.params;

    const values = {
      user,
      content,
    };

    const replyInstance = new ReplyModel(values);

    await replyInstance
      .save()
      .then(async (reply) => {
        if (parent) {
          await ReplyModel.findByIdAndUpdate(parent, {
            $push: {
              replies: reply,
            },
          }).then(async (reply) => {
            await PostModel.findOne({ _id: postId })
              .select("comments")
              .populate({
                path: "comments",
                populate: [
                  {
                    path: "user",
                    select: [
                      "_id",
                      "username",
                      "firstName",
                      "lastName",
                      "profile",
                    ],
                  },
                  {
                    path: "replies",
                    populate: {
                      path: "user",
                      select: [
                        "_id",
                        "username",
                        "firstName",
                        "lastName",
                        "profile",
                      ],
                    },
                  },
                ],
              })
              .then(({ comments }) => {
                res.status(200).send(comments);
              })
              .catch((error) => {
                res.status(500).send({ error });
              });
          });
        } else {
          await CommentModel.findByIdAndUpdate(
            commentId,
            {
              $push: {
                replies: reply,
              },
            },
            { new: true }
          )
            .then(async (comment) => {
              await PostModel.findOne({ _id: postId })
                .select("comments")
                .select("comments")
                .populate({
                  path: "comments",
                  populate: [
                    {
                      path: "user",
                      select: [
                        "_id",
                        "username",
                        "firstName",
                        "lastName",
                        "profile",
                      ],
                    },
                    {
                      path: "replies",
                      populate: {
                        path: "user",
                        select: [
                          "_id",
                          "username",
                          "firstName",
                          "lastName",
                          "profile",
                        ],
                      },
                    },
                  ],
                })
                .then(({ comments }) => {
                  res.status(200).send(comments);
                })
                .catch((error) => {
                  res.status(500).send({ error });
                });
            })
            .catch((error) => res.status(500).send(error));
        }
      })
      .catch((error) => res.status(403).send(error));
  } catch (error) {
    return res.status(500).send(error);
  }
};
