const https = require('https');
//const moment = require('moment');
const http = require('http');
const express = require("express");
const bodyParser = require("body-parser");
const res = require("express/lib/response");
const Promise = require('promise');
const distance = require('google-distance-matrix');
distance.key(process.env.MAP_API_KEY);
const app = express();
const router = express.Router();

const axios = require('axios');

// custom scripts
const rate = require('./ratecardDB.js');
const regions = require('./regionDB.js');
const customer = require('./customer.js');

// initialize rate card from csv
//rate.importCsv();

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

// Listen to notification sent fr

// sort destination by distance closest to origin
function sortDistance(origins, destinations) {
    console.log(origins + destinations);
    distance.matrix(origins, destinations, function(err, distances) {
        var calculatedDistance = [];
        if (err) {
            return console.log(err);
        }
        if (!distances) {
            return console.log('no distances');
        }

        if (distances.status == 'OK') {
            for (var i = 0; i < origins.length; i++) {
                calculatedDistance.push({
                    "distance": 0,
                    "address": origins[i]
                });
                for (var j = 0; j < destinations.length; j++) {
                    var origin = distances.origin_addresses[i];
                    var destination = distances.destination_addresses[j];

                    if (distances.rows[0].elements[j].status == 'OK') {
                        var distance = distances.rows[i].elements[j].distance.text;
                        console.log('Distance from ' + origin + ' to ' + destination + ' is ' + distance);

                        calculatedDistance.push({
                            "distance": distance.split(" ")[0],
                            "address": destinations[j]
                        });
                    } else {
                        console.log(destination + ' is not reachable by land from ' + origin);
                    }
                }
            }
        }

        calculatedDistance.sort(function(a, b) {
            return a.distance - b.distance;
        });

        console.log(calculatedDistance)
        return calculateDistance(calculatedDistance);
    });
}

// sum up distance between all destinations
function calculateDistance(ori,des) {

    var totalDistance = 0;
    var origins = [ori];
    var destinations =[des];
        distance.matrix(origins,destinations, function(err, distances) {

            if (err) {
                return console.log(err);
            }
            if (!distances) {
                return console.log('no distances');
            }

            if (distances.status == 'OK') {
                for (var i=0; i < origins.length; i++) {
                    for (var j = 0; j < destinations.length; j++) {
                        var origin = distances.origin_addresses[i];
                        var destination = distances.destination_addresses[j];
                        if (distances.rows[0].elements[j].status == 'OK') {
                            var distance = distances.rows[i].elements[j].distance.text;
                            console.log('Distance from ' + origin + ' to ' + destination + ' is ' + distance);
                        } else {
                            console.log(destination + ' is not reachable by land from ' + origin);
                        }
                    }
                }
            }
            console.log("Total distance = " + JSON.stringify(distances));
            console.log("Total distance = " + distances.rows[0].elements[0].distance.text);
            console.log("Total distance = " + distances["rows"][0]["elements"][0]["text"]);
            return totalDistance;
        });

        return totalDistance;
    
}
//courrio get order API
router.post('/price', async (request, response) => {
    // var promise = customer.checkAPIKey(request.body["api_key"]);

    // await Promise.all([promise])
    //     .then(async results => {

    //         // measure latency from the moment courrio receive api request until receive respond from tookan
    //         var startDate = moment();

    //         // fetch rate card from db
            var postCode = request.body["pickup_address"].split("Australia ");
            if(postCode.length > 1)
            {
             
                await regions.lookupPostcode(postCode[1])
                .then(res => {
                    console.log(res);
                    response.statusCode = 200;
                    response.send(res);
                })
                .catch(function(err) {

                    console.log(err);
                    response.statusCode = 200;
                    response.send(err.toString());
                    return;
                });
               
            }

            var destinations = [];
            destinations.push(request.body["pickup_address"]);
            destinations.push(request.body["delivery_address"]);
            calculateDistance(request.body["pickup_address"],request.body["delivery_address"]);
        
            // console.log("Requesting for order: " + request.body["customer_number"]);
            // console.log("Requesting for order: " + request.body["delivery_code"]);
            // console.log("Requesting for order: " + request.body["pickup_address"]);
            // console.log("Requesting for order: " + request.body["delivery_address"]);
            // console.log("Requesting for order: " + request.body["weight"]);
            // console.log("Requesting for order: " + request.body["volume"]);


    //     })
    //     .catch(function(err) {

    //         console.log(err);
    //         response.statusCode = 200;
    //         response.send(err.toString());
    //         return;
    //     });
});



app.use("/", router);

http.createServer(app).listen(80);
//https.createServer(options, app).listen(443);