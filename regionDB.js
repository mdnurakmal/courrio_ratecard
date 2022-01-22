const fs = require('fs');
const csv = require('csv-parser');
var regions = []

// init regions db

fs.createReadStream("./regionsDB.csv")
    .pipe(csv())
    .on('data', function(data) {
        try {

            var detail = {};
            detail["postcode"] = data["postcode"];
            detail["Country"] = data["Country"];
            detail["locality"] = data["locality"];
            detail["state"] = data["state"];
            detail["sa4name"] = data["sa4name"];
            detail["Region"] = data["Region"];
            regions.push(detail);

        } catch (err) {
            //error handler
        }
    })
    .on('end', function() {
        console.log("Region DB  initialized")
        //some final operation
    });


async function lookupPostcode(postcode) {
    console.log("finding " + postcode)
    for (let i = 0; i < regions.length; i++) {
        if (regions[i]["postcode"] == postcode) {
            return regions[i]["Region"]
        }
    }
    console.log("Empty");
    return {};
}


module.exports = {
    lookupPostcode,
};