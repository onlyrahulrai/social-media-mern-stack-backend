const multer = require("multer");
const path = require("path");

var maxSize = 2 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, callback) {
    let ext = path.extname(file.originalname);

    if (ext !== ".csv") {
      callback("File Doesn't in CSV format", null);
    }
    callback(null, true);
  },
  limits: { fileSize: maxSize },
});

const fileUpload = multer({
  storage: storage,
  fileFilter: function (req, file, callback) {
    let ext = path.extname(file.originalname);
    callback(null, true);
  },
  limits: { fileSize: maxSize },
})

module.exports = { upload, fileUpload };
