const ChatModel = require("../models/Chat.model.js");
const MessageModel = require("../models/Message.model.js");

exports.getChats = async (req, res) => {
  try {
    const { userId } = req.user;

    const { recipientId } = req.query;

    let filters = {};

    filters = {
      $and: [{ members: { $elemMatch: { $eq: userId } } }],
    };

    let response = null;

    if (!recipientId) {
      response = await ChatModel.find(filters);
    } else {
      response = await ChatModel.findOne({
        $and: [
          { members: { $elemMatch: { $eq: userId } } },
          { members: { $elemMatch: { $eq: recipientId } } },
        ],
      });
    }

    await ChatModel.populate(response, {
      path: "members latestMessage",
      select: [
        "content",
        "firstName",
        "lastName",
        "email",
        "profile",
        "username",
        "mobile",
        "online"
      ],
    })
      .then((data) => {
        res.status(200).send(data);
      })
      .catch(
        (error) =>
          new Error(` Couldn't be fetched ${recipientId ? "chat" : "chats"} `)
      );
  } catch (error) {
    res.status(400).send(error.message);
  }
};

exports.onGetMessages = async (req, res) => {
  try {
    const { userId } = req.user;

    const { recipientId } = req.query;

    if (!recipientId) {
      throw new Error("RecipientId is required ")
    }

    await ChatModel.findOne({
      $and: [
        { members: { $elemMatch: { $eq: userId } } },
        { members: { $elemMatch: { $eq: recipientId } } },
      ],
    }).then(async (chat) => {
      const messages = await MessageModel.find({ chat: chat._id }).populate({
        path: "sender",
        select: ["id", "profile", 'username']
      })

      return res.status(200).send(messages)
    })
      .catch((error) => new Error("Couldn't find the messages"))
  } catch (error) {
    return res.status(400).send(error.message)
  }
}

exports.onCreateMessage = async (req, res) => {
  try {
    const { userId } = req.user;

    let { recipientId } = req.body;

    await ChatModel.findOne({
      $and: [
        { members: { $elemMatch: { $eq: userId } } },
        { members: { $elemMatch: { $eq: recipientId } } },
      ],
    }).then(async (chat) => {
      if (!chat) {
        const chatData = {
          members: [userId, recipientId],
        };

        const chatInstance = new ChatModel(chatData)

        chat = await chatInstance.save()
      }

      const messageData = {
        chat,
        content: req.body.content,
        sender: userId
      }

      const messageInstance = new MessageModel(messageData);

      await MessageModel.populate(await messageInstance.save(), {
        path: "sender",
        select: ["id", "username", "profile"]
      })
        .then(async (message) => {

          await ChatModel.findByIdAndUpdate({ _id: chat._id }, { latestMessage: message }, { new: true })
            .then((chat) => res.status(201).send(message))
            .catch((error) => new Error("Couldn't Update Chat with latest message"))
        })
    })
  } catch (error) {
    console.log(" Error ", error)
  }
}