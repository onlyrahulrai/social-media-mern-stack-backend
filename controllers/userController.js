const UserModel = require("../models/User.model.js");
const bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/functions.js");
const PostModel = require("../models/Post.model.js");
const NotificationModel = require("../models/Notification.model.js");
const ChatModel = require("../models/Chat.model.js");

/** POST: http://localhost:9000/api/register
 * @param:{
        "username":"example123",
        "password":"example@123",
        "email":"example@gmail.com",
        "firstName":"bill",
        "lastName":"william",
        "mobile":8009860560,
        "address":"Apt. 556, Kulas Light, Gwenborough",
        "profile":""
    } 
 */
exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      password,
      profile,
      email,
    } = req.body;

    // check the existing user
    const existUsername = new Promise((resolve, reject) => {
      UserModel.findOne({ username })
        .then((user) => {
          if (user) reject({ error: "Please use unique username" });

          resolve();
        })
        .catch((error) => {
          res.status(500).send({ error });
        });
    });

    // check for existing email
    const existEmail = new Promise((resolve, reject) => {
      UserModel.findOne({ email })
        .then((user) => {
          if (user) return reject({ error: "Please use unique email" });

          resolve();
        })
        .catch((error) => {
          return reject({ error });
        });
    });

    Promise.all([existUsername, existEmail])
      .then(() => {
        if (password) {
          bcrypt
            .hash(password, 10)
            .then((hashPassword) => {
              const user = new UserModel({
                firstName,
                lastName,
                username,
                profile,
                email,
                password: hashPassword,
              });

              // return save result as a response
              user
                .save()
                .then((user) => {
                  const access = generateAccessToken({
                    userId: user.id,
                    username: user.username,
                  });

                  const refresh = generateRefreshToken({
                    userId: user.id,
                    username: user.username,
                  });

                  const { password, _id: id, __v, ...rest } = Object.assign(
                    {},
                    user.toJSON()
                  );

                  return res.status(201).send({ id, ...rest, access, refresh });
                })
                .catch((err) => {
                  res.status(500).send({ err });
                });
            })
            .catch((err) => {
              console.log(" Error ", err);

              return res.status(500).send({
                error: "unable to hashed password",
              });
            });
        }
      })
      .catch((err) => {
        console.log(" Error ", err);
        return res.status(500).send({ err });
      });
  } catch (error) {
    console.log(" Error ", err);
    return res.status(500).send(error);
  }
};

/**
 * @param:{
        "username":"example123",
        "password":"example@123"
    }  
 */
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    UserModel.findOne({ username })
      .then((user) => {
        bcrypt
          .compare(password, user.password)
          .then(async (passwordCheck) => {
            if (!passwordCheck)
              return res.status(404).send({ error: "Don't have Password" });

            user = await UserModel.findByIdAndUpdate({ _id: user.id }, { $set: { online: true } }, { new: true })

            const access = generateAccessToken({
              userId: user.id,
              username: user.username,
            });

            const refresh = generateRefreshToken({
              userId: user.id,
              username: user.username,
            });

            const { password, _id: id, __v, ...rest } = Object.assign(
              {},
              user.toJSON()
            );

            const countOfNotification = await (
              await NotificationModel.find({ created_for: { $in: id } })
            ).length;

            return res
              .status(200)
              .send({ id, ...rest, countOfNotification, access, refresh });
          })
          .catch((error) => {
            return res.status(404).send({ error: "Password does not match" });
          });
      })
      .catch((error) => {
        return res.status(404).send({ error: "Username doesn't found" });
      });
  } catch (error) {
    return res.status(500).send({ error });
  }
};

/** GET: http://localhost:9000/api/user/example123 */
exports.getUser = async (req, res) => {
  const { username } = req.params;

  try {
    if (!username) return res.status(501).send({ error: "Invalid Username" });

    UserModel.findOne({ username })
      .populate({
        path: "featuredPosts",
        select: ["_id", "title", "description", "photo", "created_at"],
      })
      .select("-password")
      .then((user) => {
        if (!user)
          return res.status(501).send({ error: "Couldn't find the user" });

        PostModel.find({ user: user.id })
          .sort({ created_at: "desc" })
          .then((posts) => {
            const { _id: id, ...rest } = Object.assign({}, user.toJSON());

            return res.status(200).send({ ...rest, id, posts });
          })
          .catch(() => res.status(501).send({ error: "Can't find the posts" }));
      })
      .catch((error) => {
        return res.status(501).send({ error: "Can't find User Data" });
      });
  } catch (error) {}
};

/** PUT: http://localhost:9000/api/user/example123
* @params:{
    "id":"<userid>"
  }
  body:{
    firstName:'',
    address:'',
    profile:""
  }
*/

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.user;

    if (userId) {
      const body = req.file
        ? { ...req.body, profile: req.file.filename }
        : req.body;

      // update the data
      await UserModel.findByIdAndUpdate(
        { _id: userId },
        { $set: body },
        { new: true }
      )
        .then((user) => {
          const data = Object.assign({}, user.toJSON());
          return res.status(201).send(user);
        })
        .catch((error) => {
          return res.status(400).send({ error });
        });
    } else {
      return res.status(400).send({ error: "User Not Found...!" });
    }
  } catch (error) {
    return res.status(400).send({ error });
  }
};

/** GET: http://localhost:9000/api/generate-otp/?username=example123 */
exports.generateOTP = async (req, res) => {
  req.app.locals.OTP = await otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });

  res.status(201).send({ code: req.app.locals.OTP });
};

/** GET: http://localhost:9000/api/verify-otp */
exports.verifyOTP = async (req, res) => {
  const { code } = req.query;

  if (parseInt(req.app.locals.OTP) == parseInt(code)) {
    req.app.locals.OTP = null; //reset the OTP value
    req.app.locals.resetSession = true; // start session for reset password
    return res.status(201).send({ msg: "Verify successfully!" });
  }
  return res.status(400).send({ error: "Invalid OTP" });
};

// successfully redirect user when OTP is valid
/** GET: http://localhost:9000/api/create-reset-session */
exports.createResetSession = async (req, res) => {
  if (req.app.locals.resetSession) {
    req.app.locals.resetSession = false; //allow access to this route only once

    return res.status(201).send({ msg: "access granted!" });
  }
  return res.status(440).send({ error: "Session expired!" });
};

//update the password when we have valid session
/** PUT: http://localhost:9000/api/reset-password */
exports.resetPassword = async (req, res) => {
  try {
    if (!req.app.locals.resetSession)
      return res.status(440).send({ error: "Session expired!" });

    const { username, password } = req.body;

    try {
      await UserModel.findOne({ username })
        .then((user) => {
          bcrypt
            .hash(password, 10)
            .then((hashPassword) => {
              UserModel.updateOne({ _id: user.id }, { password: hashPassword })
                .then((data) => {
                  req.app.locals.resetSession = false;
                  return res.status(201).send({ msg: "Record Updated!" });
                })
                .catch((error) => {
                  return res
                    .status(500)
                    .send({ error: "Enable to hashed password" });
                });
            })
            .catch((error) => {
              return res
                .status(500)
                .send({ error: "Enable to hashed password" });
            });
        })
        .catch((error) => {
          return res.status(404).send({ error: "Username not Found" });
        });
    } catch (error) {
      return res.status(404).send({ error });
    }
  } catch (error) {
    return res.status(400).send({ error });
  }
};

exports.verifyUser = async (data) => {
  try {
    const user = await UserModel.findById(data);
    if (user) {
      return true;
    } else {
      return false;
    }
  } catch (error) {}
};

exports.followUser = async (req, res) => {
  try {
    const { followUserId } = req.body;
    const { userId } = req.user;

    await UserModel.findByIdAndUpdate(
      followUserId,
      { $push: { followers: userId } },
      { new: true }
    )
      .then(async (followUser) => {
        await UserModel.findByIdAndUpdate(
          userId,
          { $push: { following: followUser._id } },
          { new: true }
        )
          .then((user) => {
            const key = req.headers?.friends ? "following" : "followers";
            const value = req.headers?.friends
              ? user.following
              : followUser.followers;
            return res.status(202).send({
              [key]: value,
              userConfig: { following: user.following },
            });
          })
          .catch((error) => res.status(400).send(error));
      })
      .catch((error) => res.status(400).send(error));
  } catch (error) {
    res.status(500).send({ error });
  }
};

exports.unFollowUser = async (req, res) => {
  try {
    const { followUserId } = req.body;
    const { userId } = req.user;

    await UserModel.findByIdAndUpdate(
      followUserId,
      { $pull: { followers: userId } },
      { new: true }
    )
      .then(async (followUser) => {
        await UserModel.findByIdAndUpdate(
          userId,
          { $pull: { following: followUser._id } },
          { new: true }
        )
          .then((user) => {
            const key = req.headers?.friends ? "following" : "followers";
            const value = req.headers?.friends
              ? user.following
              : followUser.followers;
            return res.status(202).send({
              [key]: value,
              userConfig: { following: user.following },
            });
          })
          .catch((error) =>
            res.status(400).send({ error: "User doesn't found!" })
          );
      })
      .catch((error) => res.status(400).send({ error: "User doesn't found!" }));
  } catch (error) {
    res.status(500).send({ error });
  }
};

exports.removeUserFromFollowers = async (req, res) => {
  try {
    const { followUserId } = req.body;
    const { userId } = req.user;

    await UserModel.findByIdAndUpdate(
      followUserId,
      { $pull: { following: userId } },
      { new: true }
    )
      .then(async (followUser) => {
        await UserModel.findByIdAndUpdate(
          userId,
          { $pull: { followers: followUser._id } },
          { new: true }
        )
          .then(({ followers }) =>
            res.status(202).send({ followers, userConfig: { followers } })
          )
          .catch((error) =>
            res.status(400).send({ error: "User doesn't found!" })
          );
      })
      .catch((error) => res.status(400).send({ error: "User doesn't found!" }));
  } catch (error) {
    res.status(500).send({ error });
  }
};

exports.refreshToken = async (req, res) => {
  const { refresh } = req.body;

  if (refresh == null) return res.sendStatus(403);

  jwt.verify(refresh, process.env.JWT_REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    console.log(" User Id ", user);

    const access = generateAccessToken({
      userId: user.userId,
      username: user.username,
    });

    res.json({
      refresh,
      access,
    });
  });
};

exports.updateUserFeaturedPosts = async (req, res) => {
  try {
    const { postId } = req.body;

    const { userId } = req.user;

    const user = await UserModel.findById(userId);

    const isPostInFeaturedPosts = user?.featuredPosts.includes(postId);

    if (isPostInFeaturedPosts) {
      user.featuredPosts.pop(postId);
    } else {
      user.featuredPosts.push(postId);
    }
    user
      .save()
      .then(async (user) => {
        const { featuredPosts } = await user.populate({
          path: "featuredPosts",
          select: ["_id", "title", "description", "created_at"],
        });

        return res.status(200).send({
          message: "Success",
          added: !isPostInFeaturedPosts,
          featuredPosts,
        });
      })
      .catch((error) => res.status(500).send(error));
  } catch (error) {
    console.log(" error ", error);

    return res.status(400).send(error);
  }
};

exports.userFollowers = async (req, res) => {
  try {
    const { username } = req.params;

    const { userId: _id } = req.user;

    const { followers } = await UserModel.findOne({ username }).populate({
      path: "followers",
      select: [
        "_id",
        "username",
        "firstName",
        "lastName",
        "profile",
        "email",
        "following",
        "followers",
      ],
    });

    const auth = await UserModel.findOne({ _id });

    return res
      .status(200)
      .send({ followers, userConfig: { followers: auth.followers } });
  } catch (error) {
    return res.status(500).send(" Couldn't find the followers... ");
  }
};

exports.userFollowing = async (req, res) => {
  try {
    const { username } = req.params;

    const { following } = await UserModel.findOne({ username }).populate({
      path: "following",
      select: [
        "_id",
        "username",
        "firstName",
        "lastName",
        "profile",
        "email",
        "followers",
        "following",
      ],
    });

    return res.status(200).send(following);
  } catch (error) {
    return res.status(500).send(" Couldn't find the followers... ");
  }
};

exports.getUserDetails = async (req, res) => {
  const { userId } = req.user;

  return await UserModel.findOne({ _id: userId }).then(async (user) => {
    const { _id: id, ...rest } = Object.assign({}, user.toJSON());

    const countOfNotification = await (
      await NotificationModel.find({ created_for: { $in: id }, read: false })
    ).length;

    return res.status(200).json({ id, countOfNotification, ...rest });
  });
};

exports.usersForConnections = async (req, res) => {
  const { userId } = req.user;

  return await UserModel.find({
    _id: { $ne: userId },
    followers: { $nin: userId },
    following: { $nin: userId },
  })
    .select({ password: 0, __v: 0 })
    .limit(5)
    .then((data) => {
      return res.status(200).json(data);
    });
};

exports.latestPosts = async (req, res) => {
  const count = await UserModel.count();

  const random = Math.floor(Math.random() * count);

  return PostModel.find({})
    .skip(random)
    .limit(5)
    .select({ title: 1, description: 1, photo: 1 })
    .then((posts) => {
      res.status(200).send(posts);
    })
    .catch((error) => {
      console.log(" Error ", error);
      res.status(500).send("Internal Server Error!");
    });
};

exports.authContects = async (req, res) => {
  const { userId } = req.user;

  const { search } = req.query;

  let searches = {};

  if (search) {
    searches = {
      $or: [
        { firstName: new RegExp(search, "i") },
        { lastName: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { username: new RegExp(search, "i") },
      ],
    };
  }

  return await UserModel.find({
    _id: { $ne: userId },
    $and: [
      { $or: [{ followers: { $in: userId } }, { following: { $in: userId } }] },
      searches,
    ],
  })
    .select({
      firstName: 1,
      lastName: 1,
      username: 1,
      email: 1,
      profile: 1,
      online: 1,
    })
    .limit(5)
    .then((contacts) => {
      return res.status(200).json(contacts);
    });
};
