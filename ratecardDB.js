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

          var detail ={};
          detail["Rate Code"]=data["Rate Code"];
          detail["Customer"]=data["Customer"];
          detail["Region"]=data["Region"];
          detail["Delivery Type"]=data["Delivery Type"];
          detail["Fixed Delivery Deadline"]=data["Fixed Delivery Deadline"];
          detail["Order window start"]=data["Order window start"];
          detail["Order Cutoff"]=data["Order Cutoff"];
          detail["Days from Order to Delivery"]=data["Days from Order to Delivery"];
          detail["Saturday Deliveries"]=data["Saturday Deliveries"];
          detail["Sunday Deliveries"]=data["Sunday Deliveries"];
          detail["Public Holiday Deliveries"]=data["Public Holiday Deliveries"];
          detail["Base Rate (ex GST)"]=data["Base Rate (ex GST)"];
          detail["Incl KM"]=data["Incl KM"];
          detail["Incl Volume"]=data["Incl Volume"];
          detail["Incl Kg"]=data["Incl Kg"];
          detail["Additional KM Rate"]=data["Additional KM Rate"];
          detail["Additional Volume Rate"]=data["Additional Volume Rate"];
          detail["Additional KG Rate"]=data["Additional KG Rate"];
          detail["Pickup Deadline"]=data["Pickup Deadline"];
          detail["Delivery Deadline Home"]=data["Delivery Deadline Home"];
          detail["Delivery Deadline Business"]=data["Delivery Deadline Business"];
          detail["Same Day Mins Pickup Deadline"]=data["Same Day Mins Pickup Deadline"];
          detail["Same Day Mins Delivery Deadline"]=data["Same Day Mins Delivery Deadline"];
          detail["Saturday Surcharge"]=data["Saturday Surcharge"];
          detail["Sunday Surcharge"]=data["Sunday Surcharge"];
          detail["PH Surcharge"]=data["PH Surcharge"];

          console.log(detail);
          initDB(detail)
          //console.log(detail);
          //perform the operation
      }
      catch(err) {
          //error handler
      }
  })
  .on('end',function(){
    console.log("Rate card DB11 initialized")
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