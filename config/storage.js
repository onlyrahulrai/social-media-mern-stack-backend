const multer = require('multer');
const {v4: uuidv4} = require('uuid');

const storage = multer.diskStorage({
    destination:(req,res,callback)=>{
        callback(null,'./uploads')
    },
    filename:(req,file,callback)=>{
        const filename = `${uuidv4()}.${file.originalname}`
        callback(null,filename)
    }
})

// filter

const fileFilter = (req,file,callback) => {
    if(file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg'){
        callback(null,true)
    }else{
        callback(null,false)
        return callback(new Error("Only .png .jpg & .jpeg formatted Allowed"))
    }
}

const upload = multer({
    storage,
    fileFilter
})

module.exports = upload;