const https = require('https');
//const moment = require('moment');
const http = require('http');
const express = require("express");
const bodyParser = require("body-parser");
const res = require("express/lib/response");
const Promise = require('promise');
const distance = require('google-distance-matrix');
const customer = require('./customer.js');
const pub = require('./pubsub.js');
var srs = require('secure-random-string');
const router = express.Router();
const app = express();
require('dotenv').config()
const axios = require('axios');
const req = require("express/lib/request");
const {
    Console
} = require('console');
var moment = require('moment-timezone');


var mysql = require('mysql');

// for(var i = 0 ; i < 10; i++)
// {
//     customer.createCustomer("test"+i.toString(),i);
// }

// var result = srs({length: 56,alphanumeric: true});
// console.log(result);
// customer.getCustomer("999");

// setup connection to Cloud SQL
var con = mysql.createConnection({
    host: "35.189.56.73",
    user: "root",
    password: "root",
    database: "courrio"
});

// connect to Cloud SQL
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});


app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

// Listen to notification sent from Tookan and distribute to client's webhook
router.post('/webhook', (request, response) => {
    console.log("receive webhook");
    //console.log(request.body);
    pub.publish(request.body);
    response.status(200);
    response.send("ok");
});

// courrio set webhook url API
router.post('/set_webhookurl', async (request, response) => {
    var promise = customer.checkAPIKey(request.body["api_key"]);

    await Promise.all([promise])
        .then(async results => {

            console.log("set webhook url: " + request.body["order_ids"]);

            // fetch customer id from api key
            // set webhook url in db

        })
        .catch(function(err) {
            console.log(err);
            response.statusCode = 200;
            response.send(err.toString());
            return;
        });


});

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
function calculateDistance(destinations) {

    var totalDistance = 0;
    for (var j = 0; j < destinations.length - 1; j++) {

        distance.matrix([destinations[j]["address"]], [destinations[j + 1]["address"]], function(err, distances) {

            if (err) {
                return console.log(err);
            }
            if (!distances) {
                return console.log('no distances');
            }

            if (distances.status == 'OK') {
                for (var i = 0; i < 1; i++) {
                    for (var j = 0; j < 1; j++) {

                        if (distances.rows[0].elements[j].status == 'OK') {
                            var distance = distances.rows[0].elements[0].distance.text;
                            console.log(distance);
                            totalDistance += parseFloat(distance.split(" ")[0]);
                        }
                    }
                }
            }


            console.log("Total distance = " + totalDistance);
            return totalDistance;
        });
    }
}

// courrio rate API
router.get('/rate', (request, response) => {

    console.log("set webhook url: " + request.body["order_ids"]);

    // fetch customer id from api key
    // set webhook url in db

});

// courrio edit order API
router.post('/edit_order', async (request, response) => {
    var promise = customer.checkAPIKey(request.body["api_key"]);

    await Promise.all([promise])
        .then(async results => {

            // measure latency from the moment courrio receive api request until receive respond from tookan
            var startDate = moment();

            console.log("Editing order: " + request.body["job_id"]);

            // fetch job id from order id from courrio DB
            // fetch whether its a pickup or delivery and change time accordingly
            axios
                .post('https://api.tookanapp.com/v2/edit_task', {
                    api_key: request.body["tookan_api_key"],
                    "fleet_id": "19750",
                    "timezone": "-660",
                    "has_pickup": "1",
                    "has_delivery": "1",
                    "layout_type": "0",
                    "job_pickup_datetime": request.body["datetime"],

                    "job_pickup_address": request.body["address"],
                    "customer_address": request.body["address"],
                    "job_id": request.body["job_id"]

                })
                .then(res => {
                    var endDate = moment();
                    var secondsDiff = endDate.diff(startDate, "seconds")
                    console.log(secondsDiff + " seconds")

                    if (res.data["status"] == "101") {
                        response.status(res.status);
                        response.send(res.data["message"]);
                    } else if (res.data["status"] == "201") {
                        response.status(res.status);
                        response.send(res.data["message"]);
                    } else {
                        response.status(res.status);
                        response.send(res.data["message"]);
                    }

                })
                .catch(error => {
                    console.error(error)
                    response.statusCode = 401;
                    response.send(error);
                })


        })
        .catch(function(err) {
            console.log(err);
            response.statusCode = 200;
            response.send(err.toString());
            return;
        });

});

//courrio delete order API
router.post('/delete_order', async (request, response) => {
    var promise = customer.checkAPIKey(request.body["api_key"]);

    await Promise.all([promise])
        .then(async results => {

            // measure latency from the moment courrio receive api request until receive respond from tookan
            var startDate = moment();

            console.log("Delete order: " + request.body["order_ids"]);

            // fetch job id from order id from courrio DB

            axios
                .post('https://api.tookanapp.com/v2/delete_task', {
                    api_key: request.body["tookan_api_key"],
                    "job_id": request.body["job_id"]
                })
                .then(res => {
                    var endDate = moment();
                    var secondsDiff = endDate.diff(startDate, "seconds")
                    console.log(secondsDiff + " seconds")

                    if (res.data["status"] == "101") {
                        response.status(res.status);
                        response.send(res.data["message"]);
                    } else if (res.data["status"] == "201") {
                        response.status(res.status);
                        response.send(res.data["message"]);
                    } else {
                        response.status(res.status);
                        response.send(res.data["message"]);
                    }

                })
                .catch(error => {
                    console.error(error)
                    response.statusCode = 401;
                    response.send(error);
                })

        })
        .catch(function(err) {
            console.log(err);
            response.statusCode = 200;
            response.send(err.toString());
            return;
        });


});

//courrio get order API
router.post('/order_status', async (request, response) => {
    var promise = customer.checkAPIKey(request.body["api_key"]);

    await Promise.all([promise])
        .then(async results => {

            // measure latency from the moment courrio receive api request until receive respond from tookan
            var startDate = moment();

            // fetch rate card from db

            console.log("Requesting for order: " + request.body["order_ids"]);

            axios
                .post('https://api.tookanapp.com/v2/get_job_details_by_order_id', {
                    api_key: request.body["tookan_api_key"],
                    "order_ids": [request.body["order_ids"]],
                    "include_task_history": 0
                })
                .then(res => {
                    var endDate = moment();
                    var secondsDiff = endDate.diff(startDate, "seconds")
                    console.log(secondsDiff + " seconds")

                    if (res.data["status"] == "101") {
                        response.status(res.status);
                        response.send(res.data["message"]);
                    } else if (res.data["status"] == "201") {
                        response.status(res.status);
                        response.send(res.data["message"]);
                    } else {
                        response.status(res.status);
                        response.send(res.data["data"]);
                    }

                })
                .catch(error => {
                    console.error(error)
                    response.statusCode = 401;
                    response.send(error);
                })

        })
        .catch(function(err) {

            console.log(err);
            response.statusCode = 200;
            response.send(err.toString());
            return;
        });



});

// courrio bulk order API
router.post('/new_order', async (request, response) => {
    var promise = customer.checkAPIKey(request.body["api_key"]);

    await Promise.all([promise])
        .then(async results => {

            // measure latency from the moment courrio receive api request until receive respond from tookan
            var startDate = moment().tz("Australia/Sydney").set({"hour": 17, "minute": 0,"second":0});
            // add order date to sql
            // get customer number from api
            // add signature required to db
            // add total packages 2
            console.log("Received new order");

            var deliveryDate = moment(startDate, "YYYY-MM-DD").tz("Australia/Sydney").add(1,"days").format("YYYY-MM-DD HH:mm:ss");
            console.log(deliveryDate);
            // format pickup orders from customers
            var promiseList = []
            var pickup_orders = []

            for (let i = 0; i < request.body["pickup_address"].length; i++) {

                var promise = new Promise(function(resolve, reject) {

                    var insert_sql = "INSERT INTO orders (order_ids) VALUES (0)";

                    con.query(insert_sql, function(err, result) {
                        if (err) reject(err);
                        console.log("Order addded: " + result.insertId);

                        pickup_orders.push({
                            "address": request.body["pickup_address"][i]["street"] + " " + request.body["pickup_address"][i]["suburb"] + " " + request.body["pickup_address"][i]["state"] + " " + request.body["pickup_address"][i]["post_code"] + " " +
                                request.body["pickup_address"][i]["country"],
                            "time": deliveryDate,
                            "phone": request.body["pickup_address"][i]["phone"],
                            "name": request.body["pickup_address"][i]["name"],
                            "email": request.body["pickup_address"][i]["pickup_email"],
                            "template_name": "Tyroola_Pickup",
                            "template_data": [{
                                    "label": "Pickup_After",
                                    "data": request.body["pickup_address"][i]["pickup_after"]
                                },
                                {
                                    "label": "Pickup_Reference",
                                    "data": request.body["pickup_address"][i]["pickup_reference"]
                                },
                                {
                                    "label": "Business_Hours",
                                    "data": request.body["pickup_address"][i]["pickup_email"]
                                },
                                {
                                    "label": "Comment",
                                    "data": request.body["pickup_address"][i]["pickup_email"]
                                }
                            ],
                            "tracking_link": 1,
                            "order_id": result.insertId
                        })
                        resolve();
                    });

                }).catch(function(rej) {
                    console.log(rej);
                });;
                promiseList.push(promise);
            }


            // format delivery orders from customers
            var delivery_orders = []
            for (let i = 0; i < request.body["delivery_address"].length; i++) {

                var promise = new Promise(function(resolve, reject) {

                    var insert_sql = "INSERT INTO orders (order_ids) VALUES (0)";
                    con.query(insert_sql, function(err, result) {

                        if (err) reject(err);

                        console.log("Order addded: " + result.insertId);

                        delivery_orders.push({
                            "address": request.body["delivery_address"][i]["street"] + " " + request.body["delivery_address"][i]["suburb"] + " " + request.body["delivery_address"][i]["state"] + " " + request.body["delivery_address"][i]["post_code"] + " " +
                                request.body["delivery_address"][i]["country"],
                            "time": deliveryDate,
                            "phone": request.body["delivery_address"][i]["phone"],
                            "name": request.body["delivery_address"][i]["name"],
                            "email": request.body["delivery_address"][i]["pickup_email"],
                            "template_name": "Tyroola_Delivery",
                            "template_data": [{
                                    "label": "Authority_To_Leave",
                                    "data": request.body["delivery_address"][i]["authority_to_leave"]
                                },
                                {
                                    "label": "Delivery_Instructions",
                                    "data": request.body["delivery_address"][i]["delivery_instructions"]
                                }
                            ],
                            "tracking_link": 1,
                            "order_id": result.insertId
                        })

                        resolve();
                    });

                }).catch(function(rej) {
                    console.log(rej);
                });;


                promiseList.push(promise);
            }

            // await Promise.all(promiseList)
            //     .then(results => {
            //         // 1 pickup to n delivery
            //         if (delivery_orders.length > pickup_orders.length) {
            //             var destinationSet = []
            //             console.log("1 pickup to n delivery");
            //             for (let i = 0; i < delivery_orders.length; i++) {
            //                 destinationSet.push(delivery_orders[i]["address"]);
            //             }
            //             sortDistance([pickup_orders[0]["address"]], destinationSet);
            //         }
            //         // n pickup to 1 delivery
            //         else {
            //             console.log("n pickup to 1 delivery");
            //             var destinationSet = []
            //             for (let i = 0; i < pickup_orders.length; i++) {
            //                 destinationSet.push(pickup_orders[i]["address"]);
            //             }
            //             sortDistance([delivery_orders[0]["address"]], destinationSet);
            //         }
            //         //response.send("ok");
            //     }).catch(error => {
            //         console.error(error)
            //         //response.statusCode = 401;
            //         //response.send(error);
            //     });


            console.log("Waiting for orders to be processed..");

            await Promise.all(promiseList)
                .then(async results => {

                    console.log("All promised completed");

                    //call create_multiple_tasks tookan api 
                    await axios
                        .post('https://api.tookanapp.com/v2/create_multiple_tasks', {
                            //api_key: process.env.API_KEY,
                            api_key: request.body["tookan_api_key"],
                            fleet_id: 19750,
                            timezone: -660,
                            has_pickup: 1,
                            has_delivery: 1,
                            layout_type: 0,
                            geofence: 0,
                            team_id: "",
                            auto_assignment: 0,
                            tags: "",
                            pickups: pickup_orders,
                            deliveries: delivery_orders
                        }
                        
                        )
                        .then(res => {
                            var endDate = moment();
                            var secondsDiff = endDate.diff(startDate, "seconds")
                            console.log(secondsDiff + " seconds");

                            if (res.data["status"] == "101") {
                                response.status(res.status);
                                response.send(res.data["message"]);
                            } else if (res.data["status"] == "201") {
                                response.status(res.status);
                                response.send(res.data["message"]);
                            } else {

                                var message = {
                                    "order_number": request.body["order_number"],
                                    "pickups": res.data["data"]["pickups"],
                                    "delivery": res.data["data"]["deliveries"]
                                }
                                response.status(res.status);
                                response.send(message);
                            }

                        })
                        .catch(error => {
                            console.error(error)
                            response.statusCode = 401;
                            response.send(error);
                        })
                });

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