require("dotenv").config({ path: "./config/.env" });
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const secret = process.env.SECRET_KEY;
const middleware = require("./middleware/middleware.js");
const config = require("./config/config.js");
const connection = config.connection;
const ip = config.ip;
const port = config.port;
const route = config.route;
const cors = require('cors');
const bcrypt = require('bcrypt');


class Handler {

  //for root
  root(req, res){
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.send('Hello, welcome to Calm. Here we are to prioritize Mental Health.');
  }

  //for login
  login(req, res) {
    //console.log(req.connection.remoteAddress);
    //console.log(req.connection.remotePort);
    let username = req.body.username;
    let password = req.body.password;

    if (username && password) {
      let sql = "SELECT password FROM users_professional WHERE username = ?";
      let params = [username];
      connection.query(sql, params, function(error, results, fields){
        if (error) {
          res.set({
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          });
          res.sendStatus(500);
        }
        if(results != ""){
          let result = results[0];
          let hashedPassword = result.password;
          //user exists
           if(bcrypt.compareSync(password, hashedPassword)) {
             // Passwords match
             let token = jwt.sign({ username: username }, secret, {
              expiresIn: "24h"
            });
            //return the JWT token for future API calls
            res.set({
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            });
            res.json({
              success: true,
              message: "Authentication Successful",
              token: token
            });
            } else {
             // Passwords don't match
             res.set({
               "Content-Type": "application/json",
               "Access-Control-Allow-Origin": "*"
             });
             res.sendStatus(401);
            }
        } else {
          //user doesnot exist
          res.set({
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          });
          res.sendStatus(404);
        }
      })
    } else {
      //username or password not provided
      res.set({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      res.sendStatus(400);
    }
  }

//for signup
signup(req, res) {
  let username = req.body.username;
  let password = req.body.password;

  if (username && password) {
    let sql = "SELECT * FROM users_professional WHERE username = ?";
    let params = [username];
    connection.query(sql, params, function(error, results, fields){
      if (error) {
        res.set({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        });
        res.sendStatus(500);
      }
      if (results != "") {
        //user already exists
        res.set({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        });
        res.sendStatus(409);
      } else {
        let saltRounds = 10;
        sql = "INSERT INTO users_professional (username, password) VALUES (?, ?)"
        let hashedPassword = bcrypt.hashSync(password, saltRounds);
        params.push(hashedPassword);
        connection.query(sql, params, function(error, results, fields){
          if(results.affectedRows > 0){
            //inserted succesfully
            res.set({
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            });
            res.sendStatus(201);
          }
        })
      }
    })
  } else {
    //username or password not provided
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.sendStatus(400);
  }
}

//for home
home(req, res){
  res.set({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  });
  res.send('{ "name":"pranjal", "age":"25", "address":"tezpur"}');
}
  
}



function start() {
  const handler = new Handler();
  //middleware
  app.use(
    bodyParser.urlencoded({
      extended: false
    })
  );
  app.use(bodyParser.json());
  //app.use(bodyParser.text());
  app.use(cors());
  //app.use(cors({origin: "http://127.0.0.1:*"}));

  app.use(express.static('views'));

  //for root
  app.get("/", handler.root);
  //for login
  app.post(route + "/login/", handler.login);
  //for signup
  app.post(route + "/signup/", handler.signup);
  //for home
  app.get(route + "/home/", middleware.checkToken, handler.home);


  app.listen(port, ip, function() {
    console.log("Server running...");
  });
}

start();
