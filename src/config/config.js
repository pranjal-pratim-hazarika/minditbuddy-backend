//mysql configuration
const mysql = require("mysql");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "calm_db"
});

connection.connect(function(err) {
  if (err) {
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.sendStatus(500);
  }
});
module.exports.connection = connection;

//api configuration
exports.route = "/api/v1";
exports.ip = "127.0.0.1";
exports.port = 3000;
