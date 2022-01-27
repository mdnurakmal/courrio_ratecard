const https = require('https');
var moment = require('moment-timezone');
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


// sum up distance between all destinations
async function calculateDistance(ori,des) {

    var totalDistance = 0;
    var origins = [ori];
    var destinations =[des];
    distance.matrix(origins,destinations, await function(err, distances) {

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

        totalDistance= distances.rows[0].elements[0].distance.text.split(" ")[0];
        console.log(totalDistance);
        return totalDistance;
    });


    
}
//courrio get order API
router.post('/price', async (request, response) => {
    var promise = customer.checkAPIKey(request.body["api_key"]);

    await Promise.all([promise])
        .then(async results => {

            var rateCode =request.body["rate_code"];
            var rateCard = await customer.getRateCard(rateCode);

            // measure latency from the moment courrio receive api request until receive respond from tookan
            var startDate = moment();

            // fetch rate card from db
            var postCode = request.body["pickup_address"].split("Australia ");
            if(postCode.length > 1)
            {
             
                await regions.lookupPostcode(postCode[1])
                .then(async res => {
                    console.log(res);

                    await calculateDistance(request.body["pickup_address"],request.body["delivery_address"])
                    .then(calculatedDis => {
                        var basePrice = 17.60;
                        var distanceCharge = calculatedDis > parseFloat(rateCard["Incl KM"]) ? (calculatedDis % parseFloat(rateCard["Incl KM"])) * parseFloat(rateCard["Additional KM Rate"]) : 0;
                        var weightCharge;
                        var volumeCharge;
                        var surcharge;
    
                        console.log(calculatedDis);
                        console.log(parseFloat(rateCard["Incl KM"]));
                        console.log(parseFloat(rateCard["Incl KM"]) + "distanceCharge is " + distanceCharge + " // " + (calculatedDis % parseFloat(rateCard["Incl KM"])));
                        response.statusCode = 200;
                        response.send(calculatedDis);
                    })
                    .catch(function(err) {

                        console.log(err);
                        response.statusCode = 400;
                        response.send(err);
                        return;
                    });

                 
                })
                .catch(function(err) {

                    console.log(err);
                    response.statusCode = 400;
                    response.send(err);
                    return;
                });
               
            }

     
        
            // console.log("Requesting for order: " + request.body["customer_number"]);
            // console.log("Requesting for order: " + request.body["delivery_code"]);
            // console.log("Requesting for order: " + request.body["pickup_address"]);
            // console.log("Requesting for order: " + request.body["delivery_address"]);
            // console.log("Requesting for order: " + request.body["weight"]);
            // console.log("Requesting for order: " + request.body["volume"]);


        })
        .catch(function(err) {

            console.log(err);
            response.statusCode = 200;
            response.send(err.toString());
            return;
        });
});



app.use("/", router);

http.createServer(app).listen(80);
//https.createServer(options, app).listen(443);