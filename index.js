const express = require('express');
const cors = require('cors')
const morgan = require('morgan');
require('dotenv').config();
require('colors');
const router = require('./router/route.js');
const connectDB = require('./config/db.js')

const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(morgan('tiny'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.disable('x-powered-by'); // less hackers know about our stack

app.use('/api',router);


app.get('/',(req,res) => {
    res.send('Welcome, John Doe');
})

// Connect to Database
connectDB();

app.listen(PORT,() => {
    console.log(`Server is running on port ${PORT}`.blue.underline.bold)
})