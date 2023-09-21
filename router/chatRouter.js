const express = require("express");
const { getChats, onGetMessages, onCreateMessage } = require("../controllers/chatController");
const { Auth } = require("../middleware/auth");
const upload = require("../config/storage");

const router = express.Router();

router.route('/').get(Auth, getChats)
router.route("/messages").get(Auth, onGetMessages).post(Auth, upload.single("file"), onCreateMessage)

module.exports = router;