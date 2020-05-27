require("dotenv").config({ path: "../config/.env" });

const secret = process.env.SECRET_KEY;

const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');

const admin = require("firebase-admin");
require("firebase/firestore");
const serviceAccount = require("../config/firestore-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://calm-db.firebaseio.com"
});
const db = admin.firestore();

//------------------CONTROLLERS------------------//
//for root
const root = (req, res) => {
  res.set({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  });
  res.send('Hello, welcome to Calm. Here we are to prioritize Mental Health.');
}

//for login
const login = (req, res) => {
  let email = req.body.email;
  let password = req.body.password;

  if (email && password) {
    let userRef = db.collection("users").doc(email);
    let getDoc = userRef.get()
    .then(doc => {
      if(doc.exists){
        //user exists
        let hashedPassword = doc.data().password;
        if(bcrypt.compareSync(password, hashedPassword)) {
          // Passwords match
          let token = jwt.sign({ email: email }, secret, {
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
  } else {
    //email or password not provided
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.sendStatus(400);
  }
}

//for signup
const signup = (req, res) => {
  let name = req.body.name;
  let email = req.body.email;
  let password = req.body.password;
  let user_type = req.body.user_type;

  if (name && email && password) {
    let userRef = db.collection("users").doc(email);
    let getDoc = userRef.get()
    .then(doc => {
      if(!doc.exists){
        //no user found i.e, user can be created
        let saltRounds = 10;
        let hashedPassword = bcrypt.hashSync(password, saltRounds);
        //forming data
        let data = {
          name: name,
          email: email,
          password: hashedPassword,
          user_type: user_type,
          account_created_at: admin.firestore.Timestamp.now(),
          status: 'active',
          account_updated_at: '',
          recent_login: ''
        };
        //extra details for professional
        if(user_type == 'professional'){
          data['occupation'] = req.body.occupation;
          data['purpose'] = req.body.purpose;
          data['qualification'] = req.body.qualification;
        }

        //inserting data into firestore
        let setDoc = userRef.set(data);
        res.set({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        });
        res.sendStatus(201);
      }else{
        //user already exists
        res.set({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        });
        res.sendStatus(409);
      }
    }).catch(err => {
      //error getting user
      res.set({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      res.sendStatus(500);
    })
  } else {
    //name, email or password not provided
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.sendStatus(400);
  }
}

//for home
const home = (req, res) => {
  res.set({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  });
  res.send('{ "msg":"valid token. access to resources granted"}');
}

module.exports = {
  root: root,
  login: login,
  signup: signup,
  home: home
};