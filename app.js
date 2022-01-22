const https = require('https');
//const moment = require('moment');

const http = require('http');
const express = require("express");
const bodyParser = require("body-parser");
const res = require("express/lib/response");
const Promise = require('promise');
const distance = require('google-distance-matrix');
const rate = require('./ratecardDB.js');
const app = express();
const router = express.Router();

const axios = require('axios');


rate.importCsv();


app.use("/", router);

http.createServer(app).listen(80);
//https.createServer(options, app).listen(443);