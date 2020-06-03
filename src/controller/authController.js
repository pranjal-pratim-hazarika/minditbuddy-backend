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

        //check user status
        if(doc.data().status == 'active'){
          //verify password if active
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
        }
        else if (doc.data().status == 'pending'){
          res.set({
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
           });
           res.json({
             status: "pending",
             message: "verify email first to login to your account"
           });
        }
        else if (doc.data().status == 'deleted'){
          res.set({
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
           });
           res.json({
             status: "deleted",
             message: "verify email to activate your account"
           });
        }
        else if (doc.data().status == 'suspended'){
          res.set({
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
           });
           res.json({
             status: "suspended",
             message: "account suspended due to spam or other reasons"
           });
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
        let randOTP = Math.random().toString(36).slice(2);
        let data = {
          name: name,
          email: email,
          password: hashedPassword,
          user_type: user_type,
          account_created_at: admin.firestore.Timestamp.now(),
          status: 'pending',
          account_updated_at: '',
          recent_login: '',
          otp: randOTP
        };
        //extra details for professional
        if(user_type == 'professional'){
          data['occupation'] = req.body.occupation;
          data['purpose'] = req.body.purpose;
          data['qualification'] = req.body.qualification;
        }

        //Sending email with OTP
        //--------------------Nodemailer--------------------------//
        "use strict";
        const nodemailer = require("nodemailer");
        // async..await is not allowed in global scope, must use a wrapper
        async function main() {
          // Generate test SMTP service account from ethereal.email

          // create reusable transporter object using the default SMTP transport
          let transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
              user: 'collegeadmissionsystem@gmail.com', // generated ethereal user
              pass: 'cas2019XXX', // generated ethereal password
            },
          });

          // send mail with defined transport object
          let info = await transporter.sendMail({
            from: '"Calm Support" <collegeadmissionsystem@gmail.com>', // sender address
            to: email, // list of receivers
            subject: "Email Verification - Calm", // Subject line
            text: "Your OTP is: "+ randOTP, // plain text body
            html: "<b>Click the link below to verify your email for Calm</b><br>http://localhost:3000/api/v1/verify?email="+email+"&otp="+randOTP, // html body
          });
        }

        main().catch(console.error);
        //-----------------------------------------------------------------//

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

//for email verification
const verifyEmail = (req, res) => {
  let email = req.query.email;
  let otp = req.query.otp;
  let userRef = db.collection("users").doc(email);
  let getDoc = userRef.get()
  .then(doc => {
    if(doc.exists){
    //user exists
      if(doc.data().otp == otp){
        //otp verified

        //Get the `FieldValue` object
        let FieldValue = admin.firestore.FieldValue;

        //delete the otp from database
        let removeOTP = userRef.update({
          otp: FieldValue.delete()
        });
        let updateStatus = userRef.update({
          status: 'active'
        });
        res.set({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        });
        res.sendStatus(200);
      }
      else{
        //wrong otp
        res.set({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
         });
         res.sendStatus(401);
      }
    }
    else{
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
  login: login,
  signup: signup,
  verifyEmail: verifyEmail,
  home: home
};