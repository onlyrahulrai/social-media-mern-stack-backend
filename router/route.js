const express = require("express");
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getUserPosts,
  likePost,
  commentPost,
  replyComment,
} = require("../controllers/postController");
const {
  register,
  login,
  getUser,
  updateUser,
  generateOTP,
  verifyOTP,
  resetPassword,
  createResetSession,
  refreshToken,
  updateUserFeaturedPosts,
  userFollowing,
  userFollowers,
  followUser,
  unFollowUser,
  removeUserFromFollowers,
  getUserDetails,
  usersForConnections,
  latestPosts,
  authContects,
} = require("../controllers/userController");
const { notification } = require("../controllers/notificationController");
const { Auth, verifyUser, localVariables } = require("../middleware/auth");
const { registerMail } = require("../controllers/mailerController");
const upload = require("../config/storage.js");


const router = express.Router();

router.route("/register").post(register);
router.route("/register-mail").post(registerMail);
router.route("/authenticate").post(verifyUser, (req, res) => res.end()); // authenticate user
router.route("/login").post(verifyUser, login); // login in app
router.route("/token/refresh").post(refreshToken);

router.route("/generate-otp").get(verifyUser, localVariables, generateOTP);
router.route("/verify-otp").get(verifyUser, verifyOTP);
router.route("/create-reset-session").get(createResetSession);
router.route("/reset-password").put(verifyUser, resetPassword);

router.route("/user-details").get(Auth, getUserDetails);

router.route("/update-user").put(Auth, upload.single("profile"), updateUser);

router
  .route("/posts")
  .get(getPosts)
  .post(Auth, upload.single("photo"), createPost);

router
  .route("/posts/:id")
  .get(getPost)
  .put(Auth, upload.single("photo"), updatePost)
  .delete(Auth, deletePost);

router.route("/posts/:id/like/").put(Auth, likePost);

router.route("/posts/:id/comment/").put(Auth, commentPost);

router
  .route("/posts/:postId/comment/:commentId/reply/")
  .put(Auth, replyComment);

router.route("/follow-user/").put(Auth, followUser);

router.route("/unfollow-user/").put(Auth, unFollowUser);

router.route("/remove-user-from-followers/").put(Auth, removeUserFromFollowers);

router.route("/featured-posts/").put(Auth, updateUserFeaturedPosts);

router.route("/followers/:username/").get(Auth, userFollowers);

router.route("/following/:username/").get(Auth, userFollowing);

router.route("/user/posts").get(Auth, getUserPosts);

router.route("/users/:username").get(getUser);

router.route("/notifications").get(Auth, notification);

router.route("/users-for-connections").get(Auth, usersForConnections);

router.route("/latest-posts").get(latestPosts);

router.route("/auth-contacts").get(Auth,authContects);

module.exports = router;
