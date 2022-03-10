const admin = require("firebase-admin");
const serviceAccount = require("./firestore-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://xxxxxxxxxxxxxxx.firebaseio.com"
});

module.exports.admin = admin
