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

function computeDeliveryDate(rate,fixedDeadline,orderCutOff,deliveryDeadline,orderDate)
{
    // same day delivery and delivery dateline set to 1700
    console.log(rate + " , " + fixedDeadline  + " , " + orderDate.format('MMMM Do YYYY, h:mm:ss a') + ", " +orderCutOff)
    var deliveryDate;
    var cutoff;
    var timeSplit = orderCutOff.split(":")[0];

    //check if order is before cutoff

    if(rate == "SDS" && fixedDeadline == 1)
    {
        cutoff = moment().tz("Australia/Sydney").set({"hour": timeSplit[0], "minute": timeSplit[1],"second":0});
        deliveryDate = moment().tz("Australia/Sydney").set({"hour": 17, "minute": 0,"second":0});
    }
    else if(rate == "VIP" && fixedDeadline == 0)
    {

        cutoff = moment().tz("Australia/Sydney").set({"hour": timeSplit[0], "minute": timeSplit[1],"second":0});
        deliveryDate = moment().tz("Australia/Sydney").set({"hour": 17, "minute": 0,"second":0});
    }
    else if(rate == "ND5" && fixedDeadline == 1)
    {

        cutoff = moment().tz("Australia/Sydney").set({"hour": timeSplit[0], "minute": timeSplit[1],"second":0});
        deliveryDate = moment().tz("Australia/Sydney").add(1,"days");
        deliveryDate.set({"hour": 17, "minute": 0,"second":0});
    }

    var isBefore = moment(orderDate).isBefore(cutoff);

    if(isBefore)
    {
        console.log("order is before cut off");
        return deliveryDate;
    }
    else
    {
        return deliveryDate;
        throw "Order is after cut off time";
    }

    //return moment(orderDate, "YYYY-MM-DD").tz("Australia/Sydney").add(1,"days").format("YYYY-MM-DD HH:mm:ss");
}

// sum up distance between all destinations
async function calculateDistance(ori,des) {

    var totalDistance = 0;
    var origins = [ori];
    var destinations =[des];
    return new Promise((resolve, reject) => {
        distance.matrix(origins,destinations,  function(err, distances) {

            if (err) {

                reject(err);
            }
            if (!distances) {
                reject('no distances');
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
            resolve(totalDistance);
        });
    })
    .catch(function(err) {
        console.log(err);
        return;
    });
       


    
}
//courrio get order API
router.post('/price', async (request, response) => {
    var promise = customer.checkAPIKey(request.body["api_key"]);

    await Promise.all([promise])
        .then(async results => {

            var rateCode =request.body["rate_code"];
            var rateCard = await customer.getRateCard(rateCode);

            var orderDate = moment().tz("Australia/Sydney");
            //var deliveryDate = computeDeliveryDate(rateCard["Delivery Type"],rateCard["Fixed Delivery Deadline"],rateCard["Order Cutoff"],rateCard["Delivery Deadline Home"],orderDate);
            var deliveryDate  = moment("29-01-2022 23:45", "DD-MM-YYYY HH:MM")

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
                        var distanceCharge = calculatedDis > parseFloat(rateCard["Incl KM"]) ? (calculatedDis - parseFloat(rateCard["Incl KM"])) * parseFloat(rateCard["Additional KM Rate"]) : 0;
                        var weightCharge = request.body["weight"] > parseFloat(rateCard["Incl Kg"]) ? (request.body["weight"] - parseFloat(rateCard["Incl Kg"])) * parseFloat(rateCard["Additional KG Rate"]) : 0;
                        var volumeCharge = request.body["volume"] > parseFloat(rateCard["Incl Volume"]) ? (request.body["volume"] - parseFloat(rateCard["Incl Volume"])) * parseFloat(rateCard["Additional Volume Rate"]) : 0;
                        var surcharge =  deliveryDate.isoWeekday == 6 || deliveryDate.isoWeekday == 7? 0.25 : 0;
                        console.log("weekday " + deliveryDate.isoWeekday);
                        console.log("base " + basePrice);
                        console.log("distanceCharge "+ distanceCharge);
                        console.log("weightCharge " + weightCharge);
                        console.log("volumeCharge " + volumeCharge);
                        console.log("surcharge " + surcharge);
                        var calculatedPrice = (basePrice + distanceCharge + weightCharge + volumeCharge) * (1 + surcharge);

                        response.statusCode = 200;
                        response.send({"price":calculatedPrice.toFixed(2)});
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