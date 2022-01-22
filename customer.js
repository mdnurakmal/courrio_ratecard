const {
  Firestore
} = require('@google-cloud/firestore');

// Create a new client
const firestore = new Firestore();

async function createCustomer(name, customer_number) {

  const res = await firestore.collection('customers').add({
      "api_key": "haSeIpOUgKAp63HZAQ2GZgu5tlGZDF3nNW9S4MhQrwlKZEI9TyvizBcD",
  });

  const detailRef = firestore.collection('customers');

  await detailRef.doc(res.id).collection('details').doc("webhook").set({
      "val": 'webhook_url' + customer_number.toString(),
  });

  await detailRef.doc(res.id).collection('details').doc("customer_number").set({
      "val": "haSeIpOUgKAp63HZAQ2GZgu5tlGZDF3nNW9S4MhQrwlKZEI9TyvizBcD",
  });


  // Obtain a document reference.
  //const document = firestore.doc('customers/');

  //    // Enter new data into the document.
  //    await document.set({
  //      title: 'Welcome to Firestore',
  //      body: 'Hello World',
  //    });
  //    console.log('Entered new data into the document');

  //    // Update an existing document.
  //    await document.update({
  //      body: 'My first Firestore app',
  //    });
  //    console.log('Updated an existing document');

  //    // Read the document.
  //    const doc = await document.get();
  //    console.log('Read the document');

}

async function getCustomer(id) {
  const customersRef = firestore.collection('customers');
  const snapshot = await customersRef.where('customer_number', '==', id.toString()).get();
  if (snapshot.empty) {
      console.log('No matching documents.');
      return;
  }

  snapshot.forEach(async doc => {
      console.log(doc.id, '=>', doc.data());
      await getDetails('customers/' + doc.id + "/details")
  });
}

async function getDetails(detailCollection) {
  const detailRef = firestore.collection(detailCollection);
  const snapshot = await detailRef.get();
  if (snapshot.empty) {
      console.log('No matching details.');
      return;
  }

  snapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data());

  });
}

function checkAPIKey(key) {
  var promise = new Promise(async function(resolve, reject) {
      const firestore = new Firestore();
      const customersRef = firestore.collection('customers');
      const snapshot = await customersRef.where('api_key', '==', key.toString()).get();
      if (snapshot.empty) {

          reject('No matching API KEY.');

      }
      resolve("Key found");
  });

  return promise;
}



module.exports = {
  createCustomer,
  getCustomer,
  checkAPIKey
};