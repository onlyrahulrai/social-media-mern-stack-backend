require("dotenv").config();
require("colors");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const router = require("./router/route.js");
const connectDB = require("./config/db.js");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const jwt_decode = require("jwt-decode");
const Notification = require("./models/Notification.model.js");
const { capitalizeText } = require("./utils/functions.js");
const UserModel = require("./models/User.model.js");

const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors());

app.use(
  bodyParser.json({
    limit: "30mb",
    extended: true,
  })
);
app.use(
  bodyParser.urlencoded({
    limit: "30mb",
    extended: true,
  })
);

app.use(morgan("tiny"));
app.use("/api/uploads", express.static("./uploads"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.disable("x-powered-by"); // less hackers know about our stack

// Connect to Database
connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_BASE_URL,
    methods: ["GET", "POST"],
  },
});

app.use("/api", router);

app.get("/", (req, res) => {
  res.send("Welcome, John Doe");
});

const connection = {};

io.on("connection", (socket) => {
  // console.log("a user connected", socket.handshake.query.token);

  if (socket.handshake.query.token) {
    const { userId, username } = jwt_decode(socket.handshake.query.token);

    connection[userId] = socket;

    socket.on("postLikedNotification", async (data) => {
      if (data.liked && userId !== data?.user) {
        console.log(" Post Liked Notification Event triggered ");

        const notification = new Notification({
          content: `${capitalizeText(username)} likes your post`,
          type: "like",
          post: data?.postId,
          created_by: userId,
        });

        notification.created_for.push(data?.user);

        notification
          .save()
          .then(async (notification) => {
            const userSocket = connection[data?.user];

            if (userSocket) {
              await notification
                .populate({
                  path: "post created_by",
                  select: [
                    "_id",
                    "likes",
                    "firstname",
                    "lastname",
                    "username",
                    "email",
                    "profile",
                  ],
                })
                .then(async (notification) => {
                  const countOfNotification = await Notification.find({
                    created_for: { $in: data?.user },
                    read: false,
                  }).count();

                  userSocket.emit("sendPostLikedNotificationMessage", {
                    countOfNotification,
                    notification,
                  });
                });
            } else {
              console.log(`User with ID ${data?.user} is not connected.`);
            }
          })
          .catch((error) => console.log(" Error ", error));
      }
    });

    socket.on("onNotificationMarkedReadRequest", async (_id) => {
      try {
        await Notification.findByIdAndUpdate(
          { _id },
          { $set: { read: true } },
          { new: true }
        ).then(async (notification) => {
          const userSocket = connection[userId];

          const countOfNotification = await Notification.find({
            created_for: { $in: userId },
            read: false,
          }).count();

          userSocket.emit("onNotificationMarkedReadResponse", {
            notification,
            countOfNotification,
          });
        });
      } catch (error) {
        console.log(" Error ", error);
      }
    });

    socket.on("onFollowUserRequest", (data) => {
      if (data.follow && userId !== data?.user) {
        const notification = new Notification({
          content: `${capitalizeText(username)} started following you.`,
          type: "follow",
          created_by: userId,
        });

        notification.created_for.push(data?.user);

        notification.save().then(async (notification) => {
          const userSocket = connection[data?.user];

          if (userSocket) {
            await notification
              .populate({
                path: "created_by",
                select: [
                  "_id",
                  "firstname",
                  "lastname",
                  "username",
                  "email",
                  "profile",
                ],
              })
              .then(async (notification) => {
                const countOfNotification = await Notification.find({
                  created_for: { $in: data?.user },
                  read: false,
                }).count();

                userSocket.emit("onFollowUserResponse", {
                  countOfNotification,
                  notification,
                });
              });
          } else {
            console.log(`User with ID ${data?.user} is not connected.`);
          }
        });
      }
    });

    socket.on("onCreatePostRequest",async (data) => {

      if (data.post) {
        const authUser = await UserModel.findOne({_id:userId})

        const followers = authUser.followers.map((follower) => follower.toString());
        const following = authUser.following.map((following) => following.toString());

        const created_for = [...new Set(followers.concat(following))]

        const notification = new Notification({
          content: `${capitalizeText(username)} created a post.`,
          type: "post",
          post:data?.post,
          created_by: userId,
          created_for
        });

        notification.save().then((notification) => {
          created_for.forEach(async (user) => {
            const userSocket = connection[user];
            
            console.log(" User ",user)

            if (userSocket) {
              await notification
                .populate({
                  path: "post created_by",
                  select: [
                    "_id",
                    "likes",
                    "firstname",
                    "lastname",
                    "username",
                    "email",
                    "profile",
                  ],
                })
                .then(async (notification) => {
                  const countOfNotification = await Notification.find({
                    created_for: { $in: user },
                    read: false,
                  }).count();
  
                  userSocket.emit("onCreatePostResponse", {
                    countOfNotification,
                    notification,
                  });
                });
            } else {
              console.log(`User with ID ${data?.user} is not connected.`);
            }
          })

        });
      }
    });


    console.log(" username ", username);
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`.blue.underline.bold);
});
