const Notification = require("../models/Notification.model.js");

exports.notification = async (req, res) => {
  const user = req.user;

  await Notification.find({ created_for: { $in: user?.userId } })
    .populate({
      path: "post created_by",
      select: ["_id","likes" ,"firstname", "lastname","username" ,"email", "profile"],
    })
    .then((notifications) => res.status(200).json(notifications))
    .catch((error) => res.status(403).send(error));
};
