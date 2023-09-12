const ChatModel = require("../models/Chat.model.js");
const UserModel = require("../models/User.model.js");

exports.onSendMessage = async (req, res) => {
  const { userId } = req.user;

  if (!req.body.message)
    res.status(400).send({ error: "Message is required!" });

  const chatData = {
    message: req.body.message,
    user: userId,
  };

  await ChatModel.findOne({
    $or: [
      { connection: connectionByAuth },
      { connection: connectionByReceiver },
    ],
  })
    .then(async (chat) => {
      let response = null;

      if (!chat) {
        const instance = new ChatModel({
          connection: connectionByAuth,
        });

        instance.chat.push(chatData);

        response = instance.save();
      } else {
        response = ChatModel.findOneAndUpdate(
          {
            $or: [
              { connection: connectionByAuth },
              { connection: connectionByReceiver },
            ],
          },
          { $push: { chat: chatData } },
          { new: true }
        );
      }

      await response
        .then((response) => res.status(200).send(response))
        .catch((error) => {
          console.log(" Error ", error);
          res.status(400).send("Couldn't send message");
        });
    })
    .catch((error) => console.log(" Error ", error));
};

exports.onGetChatMessagesByConnection = async (req, res) => {
  const { userId } = req.user;

  const connectionByAuth = req.query.receiverID.concat(userId);

  const connectionByReceiver = userId.concat(req.query.receiverID);

  return await ChatModel.findOne({
    $or: [
      { connection: connectionByAuth },
      { connection: connectionByReceiver },
    ],
  })
    .then((connection) => res.status(200).send(connection.chat.limit(2)))
    .catch((error) => console.log(" Error ", error));
};

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

      if (!response) {
        const recipient = await UserModel.findOne({ _id: recipientId });

        if (!recipient)
          throw new Error(
            ` Couldn't be fetched ${recipientId ? "chat" : "chats"} `
          );

        const data = {
          members: [userId, recipientId],
        };

        const instance = new ChatModel(data);

        response = await instance.save();
      }
    }

    await ChatModel.populate(response, {
      path: "members",
      select: [
        "firstName",
        "lastName",
        "email",
        "profile",
        "username",
        "mobile",
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
