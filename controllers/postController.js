const PostModel = require("../models/Post.model.js");
const CommentModel = require("../models/Comment.model.js");
const ReplyModel = require("../models/Reply.model.js");

exports.getPosts = async (req, res) => {
  try {
    console.log(" Request ", req.query);

    const page = parseInt(req.query.page) || 1;

    const limit = parseInt(req.query.limit) || 4;

    const skip = (page - 1) * limit;

    let filters = {};

    if ("search" in req.query) {
      filters["$or"] = [
        { title: new RegExp(req.query.search, "i") },
        { description: new RegExp(req.query.search, "i") },
      ];
    } else if ("category" in req.query) {
      filters["$or"] = [
        { "categories.value": new RegExp(req.query.category, "i") },
        { "categories.label": new RegExp(req.query.category, "i") },
      ]
    }

    const totalPosts = await PostModel.countDocuments(filters);

    const totalPages = Math.ceil(totalPosts / limit);

    const posts = await PostModel.find(filters)
      .sort({ created_at: "desc" })
      .populate("user")
      .skip(skip)
      .limit(limit);

    const hasNext = page < totalPages;

    const hasPrevious = page > 1;

    const response = {
      posts,
      currentPage: page,
      totalPages: totalPages,
      hasNext: hasNext,
      hasPrevious: hasPrevious,
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.user;

    await PostModel.find({ user: userId })
      .then((posts) => {
        return res.status(200).json(posts);
      })
      .catch((error) => {
        return res.status(204).send({ error });
      });
  } catch (error) {
    return res.status(400).send({ error });
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
    .then(async (post) => {
      if (!post)
        return res.status(404).send({ error: "Couldn't Find the post" });

      const relatedPosts = await PostModel.find({
        _id: { $ne: post._id },
        user: post.user,
      })
        .select(["title", "description", "photo", "user"])
        .populate({
          path: "user",
          select: [
            "_id",
            "username",
            "firstName",
            "lastName",
            "profile",
            "email",
          ],
        })
        .limit(3);

      res.status(200).send({ post, relatedPosts });
    })
    .catch((error) => {
      res.status(500).send({ error });
    });
};

exports.createPost = async (req, res) => {
  const { title, description, categories } = req.body;
  const photo = req.file.filename;
  const { userId } = req.user;

  if (Boolean(title) && Boolean(description) && Boolean(photo)) {
    const post = new PostModel({
      title,
      description,
      categories: JSON.parse(categories),
      photo,
      user: userId,
    });

    await post
      .save()
      .then((post) => {
        const { _id: id, ...rest } = Object.assign({}, post.toJSON());
        res.status(201).send({ id, ...rest });
      })
      .catch((error) => {
        console.log(" Error ", error);
        res.status(500).send({ error });
      });
  }
};

exports.updatePost = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  const { categories, ...rest } = req.body;

  const body = req.file
    ? Object.assign(rest, {
        photo: req.file.filename,
        categories: JSON.parse(categories),
      })
    : { ...rest, categories: JSON.parse(categories) };

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
      console.log(" Error ", error);
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
