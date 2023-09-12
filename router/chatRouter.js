const express = require("express");
const { getChats } = require("../controllers/chatController");
const { Auth } = require("../middleware/auth");

const router = express.Router();

router.route('/').get(Auth,getChats)

module.exports = router;