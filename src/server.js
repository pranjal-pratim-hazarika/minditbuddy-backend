require("dotenv").config({ path: "./config/.env" });

const ip = process.env.IP;
const port = process.env.PORT;
const route = process.env.ROUTE;

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require('cors');

const middleware = require("./middleware/middleware.js");
const authController = require("./controller/authController.js");

function start() {
  app.use(
    bodyParser.urlencoded({
      extended: false
    })
  );
  app.use(bodyParser.json());
  app.use(cors());

  app.listen(port, ip, function() {
    console.log("Server running...");
  });
  
  //-------------ROUTES------------------//

  //for login
  app.post(route + "/login", authController.login);
  //for signup
  app.post(route + "/signup", authController.signup);
  //for email verification
  app.get(route + "/verify", authController.verifyEmail);
  //for client dashboard
  app.get(route + "/client/dashboard", middleware.checkToken, authController.clientDashboard);
}
  
start();
  