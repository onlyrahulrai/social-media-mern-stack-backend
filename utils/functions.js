const jwt = require('jsonwebtoken');
const accessTokenExpiryTime = '1d';
const refreshTokenExpiryTime = '7d';

exports.generateAccessToken = (user) => {
    console.log(" User ",user)

    return jwt.sign(user, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: accessTokenExpiryTime });
}

exports.generateRefreshToken = (user) => {
    return jwt.sign(user, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: refreshTokenExpiryTime });
}

exports.capitalizeText = (text = "") => text.charAt(0).toUpperCase() + text.slice(1)

exports.addNewLineAfterWords = (inputString, wordsPerLine) => {
    // Split the input string into an array of words
    const words = inputString.split(" ");

    // Initialize an array to hold the lines
    const lines = [];

    // Iterate through the words and group them into lines
    for (let i = 0; i < words.length; i += wordsPerLine) {
        // Slice the words for the current line
        const lineWords = words.slice(i, i + wordsPerLine);

        // Join the lineWords array back into a string with spaces
        const line = lineWords.join(' ');

        // Push the line into the lines array
        lines.push(line);
    }

    // Join the lines with new line characters to get the final result
    const resultString = lines.join('<br />');

    return resultString;
}