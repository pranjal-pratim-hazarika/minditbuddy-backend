require("dotenv").config({ path: "./config/.env" });

const ip = process.env.IP;
const port = process.env.PORT;
const route = process.env.ROUTE;

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require('cors');

//import middleware and controllers
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
  app.post(route + "/verify", authController.verifyEmail);
  //for reset password
  app.post(route + "/resetPassword", authController.resetPassword);
  //for closing account
  app.post(route + "/closeAccount", middleware.checkToken, authController.closeAccount);
  //for change password
  app.post(route + "/changePassword", middleware.checkToken, authController.changePassword);
  //for dashboard
  app.get(route + "/dashboard", middleware.checkToken, authController.dashboard);
  //for update profile
  app.post(route + "/updateProfile", middleware.checkToken, authController.updateProfile);
}

start();
  