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
const staffController = require("./controller/staffController.js");
const userController = require("./controller/userController.js");

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

  //for add staff
  app.post(route + "/addStaff", [middleware.checkToken, middleware.verifyAdmin], staffController.addStaff);
  //for suspend staff
  app.post(route + "/suspendStaff", [middleware.checkToken, middleware.verifyAdmin], staffController.suspendStaff);
  //for view staff
  app.get(route + "/viewStaff", middleware.checkToken, staffController.viewStaff);
  //for search user
  app.get(route + "/searchUser", middleware.checkToken, staffController.searchUser);
  //for view feedback
  app.get(route + "/viewFeedback", middleware.checkToken, staffController.viewFeedback);
  //for add notification
  app.post(route + "/addNotification", middleware.checkToken, staffController.addNotification);
  
  //for add feedback
  app.post(route + "/addFeedback", middleware.checkToken, userController.addFeedback);
  //for view notification
  app.get(route + "/viewNotification", middleware.checkToken, userController.viewNotification);

  
}

start();