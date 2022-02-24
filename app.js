

const https = require('https');
var moment = require('moment-timezone');
const momentDefault = require('moment');
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

//logging
const apiMetrics = require('prometheus-api-metrics');
app.use(apiMetrics())

app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());

function checkIfNextDayIsWeekend(deliveryDate,deliveryDays)
{
	var daysToAdd=0;
	var tempDate = deliveryDate.clone();
	for (let i = 0; i < deliveryDays; i++) 
	{
		var dayOfWeekBeforeDeliveryDays = tempDate.format('dddd');
		console.log(dayOfWeekBeforeDeliveryDays);
		if(dayOfWeekBeforeDeliveryDays === 'Saturday' || dayOfWeekBeforeDeliveryDays === 'Sunday')
		{
			daysToAdd+=1;
			deliveryDays+=1;
		}

		tempDate = tempDate.add(1, "days");
	}
	
	console.log("Additional days for weekend " + daysToAdd);
	return daysToAdd;

}


function computeDeliveryDate(rate, fixedDeadline, orderCutOff, deliveryDeadline,daysToDelivery, orderDate) {
	// same day delivery and delivery dateline set to 1700
	console.log(rate + " , " + fixedDeadline + " , " + orderDate.format('MMMM Do YYYY, h:mm:ss a') + ", " + orderCutOff)


	var cutoff;
	var timeSplit = orderCutOff.split(":")

	//check if order is before cutoff
	console.log("Original days to delivery " + daysToDelivery);
	var cutoff = moment();
	cutoff.set('year', orderDate.format('YYYY'));
	cutoff.set('month', parseInt(orderDate.format('MM'))-1);  // April
	cutoff.set('date', orderDate.format('DD'));
	cutoff.set('hour', timeSplit[0]);
	cutoff.set('minute', timeSplit[1]);

	console.log("orderDate time"+ orderDate.format("YYYY-MM-DD HH:mm:ss"));
	console.log("cutoff time"+ cutoff.format("YYYY-MM-DD HH:mm:ss"));

	var deliveryDate = moment();
	deliveryDate.set('year', orderDate.format('YYYY'));
	deliveryDate.set('month',  parseInt(orderDate.format('MM'))-1);  // April
	deliveryDate.set('date', orderDate.format('DD'));
	deliveryDate.set('hour', 17);
	deliveryDate.set('minute', 0);

	console.log("Original deliveryDate " + deliveryDate.format("YYYY-MM-DD HH:mm:ss"))
	var isBefore = moment(orderDate.format("YYYY-MM-DD HH:mm:ss")).isBefore(cutoff);

	if (isBefore) {
		deliveryDate = deliveryDate.add(1, "days");
		daysToDelivery+= checkIfNextDayIsWeekend(deliveryDate,daysToDelivery)-1;
		deliveryDate = deliveryDate.add(daysToDelivery, "days");
		console.log(deliveryDate.format("YYYY-MM-DD HH:mm:ss"));
		console.log("Order placed before cut off time : Order is placed as next day")
		return deliveryDate;
	} else {

		// add 1 day because its next day
		deliveryDate = deliveryDate.add(2, "days");
		daysToDelivery+= checkIfNextDayIsWeekend(deliveryDate,daysToDelivery)-1;
		deliveryDate = deliveryDate.add(daysToDelivery, "days");
		console.log(deliveryDate.format("YYYY-MM-DD HH:mm:ss"));
		console.log("Order placed after cut off time : Order is placed as next day")

		return deliveryDate;
		//throw "Order is after cut off time";
	}

	//return moment(orderDate, "YYYY-MM-DD").tz("Australia/Sydney").add(1,"days").format("YYYY-MM-DD HH:mm:ss");
}


// sum up distance between all destinations
async function calculateDistance(ori, des) {

	var totalDistance = 0;
	var origins = [ori];
	var destinations = [des];
	return new Promise((resolve, reject) => {
			distance.matrix(origins, destinations, function(err, distances) {

				if (err) {

					reject(err);
				}
				if (!distances) {
					reject('no distances');
				}

				if (distances.status == 'OK') {
					for (var i = 0; i < origins.length; i++) {
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

				totalDistance = distances.rows[0].elements[0].distance.text.split(" ")[0];
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

			var rateCode = request.body["rate_code"];
			var rateCard = await customer.getRateCard(rateCode);

			var orderDate = moment().tz("Australia/Sydney");
			var deliveryDate = computeDeliveryDate(rateCard["Delivery Type"], rateCard["Fixed Delivery Deadline"], rateCard["Order Cutoff"], rateCard["Delivery Deadline Home"],parseInt(rateCard["Days from Order to Delivery"]), orderDate);
			//var deliveryDate1  = moment("29-01-2022 22:24", "DD-MM-YYYY hh:mm")

			// measure latency from the moment courrio receive api request until receive respond from tookan
			var startDate = moment();

			// fetch rate card from db
			var postCode = request.body["pickup_address"].split("Australia ");
			if (postCode.length > 1) {

				await regions.lookupPostcode(postCode[1])
					.then(async res => {
						console.log(res);

						await calculateDistance(request.body["pickup_address"], request.body["delivery_address"])
							.then(calculatedDis => {
								var basePrice = parseFloat(rateCard["Base Rate (ex GST)"]);
								var distanceCharge = calculatedDis > parseFloat(rateCard["Incl KM"]) ? (calculatedDis - parseFloat(rateCard["Incl KM"])) * parseFloat(rateCard["Additional KM Rate"]) : 0;
								var weightCharge = request.body["weight"] > parseFloat(rateCard["Incl Kg"]) ? (request.body["weight"] - parseFloat(rateCard["Incl Kg"])) * parseFloat(rateCard["Additional KG Rate"]) : 0;
								var volumeCharge = request.body["volume"] > parseFloat(rateCard["Incl Volume"]) ? (request.body["volume"] - parseFloat(rateCard["Incl Volume"])) * parseFloat(rateCard["Additional Volume Rate"]) : 0;
								var surcharge = deliveryDate.isoWeekday() == 6 || deliveryDate.isoWeekday() == 7 ? 0.25 : 0;
								console.log(request.body["weight"] + " // " + parseFloat(rateCard["Incl Kg"]));

								console.log("weekday " + deliveryDate.isoWeekday() + " / " + parseFloat(rateCard["Additional KG Rate"]));
								console.log("base " + basePrice);
								console.log("distanceCharge " + distanceCharge);
								console.log("weightCharge " + weightCharge);
								console.log("volumeCharge " + volumeCharge);
								console.log("surcharge " + surcharge);
								var calculatedPrice = (basePrice + distanceCharge + weightCharge + volumeCharge) * (1 + surcharge);

								response.statusCode = 200;
								response.send({
									"price": calculatedPrice.toFixed(1),
									"total_dist": calculatedDis
								});
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