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
          var detail = []

          detail.push({"Customer":data["Customer"]});
          detail.push({"Region":data["Region"]});
          detail.push({"Delivery Type":data["Delivery Type"]});
          detail.push({"Fixed Delivery Deadline":data["Fixed Delivery Deadline"]});
          detail.push({"Order window start":data["Order window start"]});
          detail.push({"Order Cutoff":data["Order Cutoff"]});
          detail.push({"Days from Order to Delivery":data["Days from Order to Delivery"]});
          detail.push({"Saturday Deliveries":data["Saturday Deliveries"]});
          detail.push({"Sunday Deliveries":data["Sunday Deliveries"]});
          detail.push({"Public Holiday Deliveries":data["Public Holiday Deliveries"]});
          detail.push({"Base Rate (ex GST)":data["Base Rate (ex GST)"]});
          detail.push({"Incl KM":data["Incl KM"]});
          detail.push({"Incl Volume":data["Incl Volume"]});
          detail.push({"Incl Kg":data["Incl Kg"]});
          detail.push({"Additional KM Rate":data["Additional KM Rate"]});
          detail.push({"Additional Volume Rate":data["Additional Volume Rate"]});
          detail.push({"Additional KG Rate":data["Additional KG Rate"]});
          detail.push({"Pickup Deadline":data["Pickup Deadline"]});
          detail.push({"Delivery Deadline Home":data["Delivery Deadline Home"]});
          detail.push({"Delivery Deadline Business":data["Delivery Deadline Business"]});
          detail.push({"Same Day Mins Pickup Deadline":data["Same Day Mins Pickup Deadline"]});
          detail.push({"Same Day Mins Delivery Deadline":data["Same Day Mins Delivery Deadline"]});
          detail.push({"Saturday Surcharge":data["Saturday Surcharge"]});
          detail.push({"Sunday Surcharge":data["Sunday Surcharge"]});
          detail.push({"PH Surcharge":data["PH Surcharge"]});

          initDB(data["Rate Code"],detail)
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

async function initDB(ratecode, detail) {

  const res = await firestore.collection('pricing').add({
      "rate code": ratecode,
  });

  const detailRef = firestore.collection('pricing');

  await detailRef.doc(res.id).collection('details').add({
    "detail": detail,
});
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