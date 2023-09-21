const express = require("express");
const { getChats,onGetMessages,onCreateMessage } = require("../controllers/chatController");
const { Auth } = require("../middleware/auth");

const router = express.Router();

router.route('/').get(Auth, getChats)
router.route("/messages").get(Auth, onGetMessages).post(Auth, onCreateMessage)

module.exports = router;