const jwt = require('jsonwebtoken');
const UserModel = require('../models/User.model');
const verifyUser = async (req,res,next) => {
    try {
        const {username} = req.method == "GET" ? req.query : req.body;

        // check the user existence
        let exist = await UserModel.findOne({username})
        if(!exist) return res.status(404).send({error:"Can't find user!"})

        next()
    } catch (error) {
        return res.status(404).send({error:"Authentication Error"})
    }
}

const Auth = async (req,res,next) => {
    try {
        // Access authorize header to validate request
        const token = req.headers.authorization.split(" ")[1]

        // retrive the user details for the logged in user
        const decodedToken = await jwt.verify(token,process.env.JWT_ACCESS_TOKEN_SECRET);

        req.user = decodedToken;

        next()
    } catch (error) {
        console.log(error)
        res.status(401).json({error:"Authentication Failed!"})
    }
}

const localVariables = (req,res,next) => {
    req.app.locals = {
        OTP:null,
        resetSession:false
    }
    next()
}


module.exports = {Auth,localVariables,verifyUser};