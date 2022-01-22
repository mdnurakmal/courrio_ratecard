const fs = require('fs'); 
const csv = require('csv-parser');

const {
  Firestore
} = require('@google-cloud/firestore');

function importCsv() {
  fs.createReadStream("./fix.csv")
  .pipe(csv())
  .on('data', function(data){
      try {
          //console.log(data["Rate Code"]);
          var detail = {}
          detail.add({"Rate Code":data["Rate Code"]});
          detail.add({"Customer":data["Customer"]});
          detail.add({"Region":data["Region"]});
          detail.add({"Delivery Type":data["Delivery Type"]});
          detail.add({"Fixed Delivery Deadline":data["Fixed Delivery Deadline"]});
          detail.add({"Order window start":data["Order window start"]});
          detail.add({"Order Cutoff":data["Order Cutoff"]});
          detail.add({"Days from Order to Delivery":data["Days from Order to Delivery"]});
          detail.add({"Saturday Deliveries":data["Saturday Deliveries"]});
          detail.add({"Sunday Deliveries":data["Sunday Deliveries"]});
          detail.add({"Public Holiday Deliveries":data["Public Holiday Deliveries"]});
          detail.add({"Base Rate (ex GST)":data["Base Rate (ex GST)"]});
          detail.add({"Incl KM":data["Incl KM"]});
          detail.add({"Incl Volume":data["Incl Volume"]});
          detail.add({"Incl Kg":data["Incl Kg"]});
          detail.add({"Additional KM Rate":data["Additional KM Rate"]});
          detail.add({"Additional Volume Rate":data["Additional Volume Rate"]});
          detail.add({"Additional KG Rate":data["Additional KG Rate"]});
          detail.add({"Pickup Deadline":data["Pickup Deadline"]});
          detail.add({"Delivery Deadline Home":data["Delivery Deadline Home"]});
          detail.add({"Delivery Deadline Business":data["Delivery Deadline Business"]});
          detail.add({"Same Day Mins Pickup Deadline":data["Same Day Mins Pickup Deadline"]});
          detail.add({"Same Day Mins Delivery Deadline":data["Same Day Mins Delivery Deadline"]});
          detail.add({"Saturday Surcharge":data["Saturday Surcharge"]});
          detail.add({"Sunday Surcharge":data["Sunday Surcharge"]});
          detail.add({"PH Surcharge":data["PH Surcharge"]});

          initDB(detail)
          //console.log(detail);
          //perform the operation
      }
      catch(err) {
          //error handler
      }
  })
  .on('end',function(){
    console.log("Rate card DB initialized")
      //some final operation
  });  

}


// Create a new client
const firestore = new Firestore();

async function initDB( detail) {

  const res = await firestore.collection('pricing').add(detail);

}

//   // Obtain a document reference.
//   //const document = firestore.doc('customers/');

//   //    // Enter new data into the document.
//   //    await document.set({
//   //      title: 'Welcome to Firestore',
//   //      body: 'Hello World',
//   //    });
//   //    console.log('Entered new data into the document');

//   //    // Update an existing document.
//   //    await document.update({
//   //      body: 'My first Firestore app',
//   //    });
//   //    console.log('Updated an existing document');

//   //    // Read the document.
//   //    const doc = await document.get();
//   //    console.log('Read the document');

// }

// async function getCustomer(id) {
//   const customersRef = firestore.collection('customers');
//   const snapshot = await customersRef.where('customer_number', '==', id.toString()).get();
//   if (snapshot.empty) {
//       console.log('No matching documents.');
//       return;
//   }

//   snapshot.forEach(async doc => {
//       console.log(doc.id, '=>', doc.data());
//       await getDetails('customers/' + doc.id + "/details")
//   });
// }

// async function getDetails(detailCollection) {
//   const detailRef = firestore.collection(detailCollection);
//   const snapshot = await detailRef.get();
//   if (snapshot.empty) {
//       console.log('No matching details.');
//       return;
//   }

//   snapshot.forEach(doc => {
//       console.log(doc.id, '=>', doc.data());

//   });
// }

// function checkAPIKey(key) {
//   var promise = new Promise(async function(resolve, reject) {
//       const firestore = new Firestore();
//       const customersRef = firestore.collection('customers');
//       const snapshot = await customersRef.where('api_key', '==', key.toString()).get();
//       if (snapshot.empty) {

//           reject('No matching API KEY.');

//       }
//       resolve("Key found");
//   });

//   return promise;
// }



module.exports = {
  importCsv,
  // createCustomer,
  // getCustomer,
  // checkAPIKey
};