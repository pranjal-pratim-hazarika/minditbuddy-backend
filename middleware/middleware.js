require("dotenv").config({ path: "../config/.env" });

const secret = process.env.SECRET_KEY;

const { admin } = require('../config/firebaseConfig.js');
const db = admin.firestore();
const jwt = require("jsonwebtoken");

const checkToken = (req, res, next) => {
  let token = req.headers["x-access-token"] || req.headers["authorization"];

  if (token) {
    if (token.startsWith("Bearer ")) {
      token = token.slice(7, token.length);
    }
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        res.set({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        });
        return res.json({
          success: false,
          message: "Token is not valid"
        });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    return res.json({
      success: false,
      message: "Auth token is not supplied"
    });
  }
};

const verifyStaff = (req, res, next) => {
  let email = req.body.email;
  if(email){
    let userRef = db.collection("users").doc(email);
    let getDoc = userRef.get()
    .then(doc => {
      if(doc.exists){
        if(doc.data().user_type == 'staff'){
          next();
        }else {
          //not staff
          res.set({
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          });
          res.sendStatus(401);
        }
      }else{
        //user doesnot exist
        res.set({
         "Content-Type": "application/json",
         "Access-Control-Allow-Origin": "*"
        });
        res.sendStatus(404);
      }
    }).catch(err => {
      //error getting user
      res.set({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      res.sendStatus(500);
    })
  }else {
    //email not provided
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.sendStatus(400);
  }
};

const verifyAdmin = (req, res, next) => {
  let email = req.body.email;
  if(email){
    let userRef = db.collection("users").doc(email);
    let getDoc = userRef.get()
    .then(doc => {
      if(doc.exists){
        if(doc.data().admin == 'true'){
          next();
        }else {
          //not admin
          res.set({
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          });
          res.sendStatus(401);
        }
      }else{
        //user doesnot exist
        res.set({
         "Content-Type": "application/json",
         "Access-Control-Allow-Origin": "*"
        });
        res.sendStatus(404);
      }
    }).catch(err => {
      //error getting user
      res.set({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      res.sendStatus(500);
    })
  }else {
    //email not provided
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.sendStatus(400);
  }
};

module.exports = {
  checkToken: checkToken,
  verifyStaff: verifyStaff,
  verifyAdmin: verifyAdmin
};