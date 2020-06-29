require("dotenv").config({ path: "../config/.env" });

const secret = process.env.SECRET_KEY;

const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const moment = require("moment");

const { admin } = require('../config/firebaseConfig.js');
const db = admin.firestore();

const clientRef = db.collection("statistics").doc("client");
const professionalRef = db.collection("statistics").doc("professional");

//------------------NODEMAILER---------------------//
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});
//-------------------------------------------------//

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
            //update recent login
            let updateLoginTime = userRef.update({recent_login: admin.firestore.Timestamp.now()});
            //set jwt token
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
              token: token,
              user_type: doc.data().user_type
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
        //-----------------------------------------------------------------//
        let html = fs.readFileSync(path.join(__dirname, '/email_templates/welcome.html'), 'utf8');
        let template = handlebars.compile(html);
        let replacements = {
          name: name,
		      otp: randOTP
        };
        let htmlToSend = template(replacements);
	      let info = transporter.sendMail({
            from: {
              name: process.env.EMAIL_NAME,
              address: process.env.EMAIL_USERNAME
            }, // sender address
            to: email, // receiver address
            subject: "Email Verification", // Subject line
            text: 'Welcome '+name+', your OTP is:'+randOTP, //teodyxt b
            html: htmlToSend, // html body
        });
        //-----------------------------------------------------------------//

        //inserting data into firestore
        let setDoc = userRef.set(data);

        //update statistics
        if(user_type == 'client'){
          let getDoc = clientRef.get()
          .then(doc => {
            let newPending = eval(doc.data().pending + 1);
            let updateStatistics = clientRef.update({
              pending: newPending
            });
          })
        }
        else if(user_type == 'professional'){
          let getDoc = professionalRef.get()
          .then(doc => {
            let newPending = eval(doc.data().pending + 1);
            let updateStatistics = professionalRef.update({
              pending: newPending
            });
          })
        }
        
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
  let email = req.body.email;
  let otp = req.body.otp;
  let userRef = db.collection("users").doc(email);
  let getDoc = userRef.get()
  .then(doc => {
    if(doc.exists){
    //user exists
      if(doc.data().otp == otp){
        //otp verified

        //remove otp
        let updateOTP = userRef.update({
          otp: ''
        });
        //update status
        let updateStatus = userRef.update({
          status: 'active'
        });

        //update statistics
        if(doc.data().user_type == 'client'){
          let getDoc = clientRef.get()
          .then(doc => {
            let newActive = eval(doc.data().active + 1);
            let newPending = eval(doc.data().pending - 1);
            let updateStatistics = clientRef.update({
              active: newActive,
              pending: newPending
            });
          })
        }
        else if(doc.data().user_type == 'professional'){
          let getDoc = professionalRef.get()
          .then(doc => {
            let newActive = eval(doc.data().active + 1);
            let newPending = eval(doc.data().pending - 1);
            let updateStatistics = professionalRef.update({
              active: newActive,
              pending: newPending
            });
          })
        }

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


//for reset password
const resetPassword = (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let otp = req.body.otp;

  if (email) {
    let userRef = db.collection("users").doc(email);
    let getDoc = userRef.get()
    .then(doc => {
      if(doc.exists){
        //user exists

        //check user status
        if(doc.data().status == 'active'){
          //if otp provided compare otp
          if(otp){
            if(doc.data().otp == otp){
              //if otp matched, update password
              let saltRounds = 10;
              let hashedPassword = bcrypt.hashSync(password, saltRounds);
              
              let updatePassword = userRef.update({
                password: hashedPassword
              });
              //remove otp
              let updateOTP = userRef.update({
                otp: ''
              });

              //update account update time
              let updateAccountUpdateTime = userRef.update({account_updated_at: admin.firestore.Timestamp.now()});

              res.set({
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              });
              res.sendStatus(200);
            }
            else{
              //otp didnot match
              res.set({
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              });
              res.sendStatus(401);
            }
          }
          else{
            //send otp in email
            //-----------------------------------------------------------------//
            let name = doc.data().name;
            //generate otp
            let randOTP = Math.random().toString(36).slice(2);
            //update otp
            let updateOTP = userRef.update({
              otp: randOTP
            });

            let html = fs.readFileSync(path.join(__dirname, '/email_templates/passwordReset.html'), 'utf8');
            
            let template = handlebars.compile(html);
            let replacements = {
              name: name,
		          otp: randOTP
            };
            let htmlToSend = template(replacements);
	          let info = transporter.sendMail({
              from: {
                name: process.env.EMAIL_NAME,
                address: process.env.EMAIL_USERNAME
              }, // sender address
              to: email, // receiver address
              subject: "Password Reset", // Subject line
              text: 'Hello '+name+', your OTP is:'+randOTP, //teodyxt b
              html: htmlToSend, // html body
            });
            //-----------------------------------------------------------------//
            res.set({
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            });
            res.sendStatus(200);
          }
        }
        else{
          res.set({
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
           });
           res.json({
             status: "not_active",
             message: "account is not active"
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
    //email not provided
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.sendStatus(400);
  }
}

//for closing account
const closeAccount = (req, res) => {
  let email = req.body.email;

  if (email) {
    let userRef = db.collection("users").doc(email);
    let getDoc = userRef.get()
    .then(doc => {
      //update status
      let updateStatus = userRef.update({
        status: 'deleted'
      });

      //update account update time
      let updateAccountUpdateTime = userRef.update({account_updated_at: admin.firestore.Timestamp.now()});

      //update statistics
      if(doc.data().user_type == 'client'){
        let getDoc = clientRef.get()
        .then(doc => {
          let newActive = eval(doc.data().active - 1);
          let newDeleted = eval(doc.data().deleted + 1);
          let updateStatistics = clientRef.update({
            active: newActive,
            deleted: newDeleted
          });
        })
      }
      else if(doc.data().user_type == 'professional'){
        let getDoc = professionalRef.get()
        .then(doc => {
          let newActive = eval(doc.data().active - 1);
          let newDeleted = eval(doc.data().deleted + 1);
          let updateStatistics = professionalRef.update({
            active: newActive,
            deleted: newDeleted
          });
        })
      }

      res.set({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      res.sendStatus(200);

    }).catch(err => {
      //error getting user
      res.set({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      res.sendStatus(500);
    })
  } else {
    //email not provided
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.sendStatus(400);
  }
}

//for change password
const changePassword = (req, res) => {
  let email = req.body.email;
  let oldPassword = req.body.oldPassword;
  let newPassword = req.body.newPassword;

  if (email && oldPassword && newPassword) {
    let userRef = db.collection("users").doc(email);
    let getDoc = userRef.get()
    .then(doc => {
          let hashedPassword = doc.data().password;
          if(bcrypt.compareSync(oldPassword, hashedPassword)) {
            //old Passwords match
            //update new password
            let saltRounds = 10;
            let newHashedPassword = bcrypt.hashSync(newPassword, saltRounds);
              
            let updatePassword = userRef.update({
              password: newHashedPassword
            });

            //update account update time
            let updateAccountUpdateTime = userRef.update({account_updated_at: admin.firestore.Timestamp.now()});
            
            res.set({
             "Content-Type": "application/json",
             "Access-Control-Allow-Origin": "*"
            });
            res.sendStatus(200);
          } else {
            // Old Passwords don't match
            res.set({
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            });
            res.sendStatus(401);
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
    //email new password & old password not provided
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.sendStatus(400);
  }
}

//for dashboard
const dashboard = (req, res) => {
  let email = req.query.email;
  let userRef = db.collection("users").doc(email);
  let getDoc = userRef.get()
  .then(doc => {
    if(doc.exists){
    //user exists
      res.set({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      if(doc.data().user_type == 'client'){
        res.json({
          name: doc.data().name,
          member_since: moment(
            doc.data().account_created_at.seconds * 1000
          ).format("MMMM Do YYYY"),
          last_update: moment(
            doc.data().account_updated_at.seconds * 1000
          ).format("MMMM Do YYYY, h:mm a")
        });
      }
      else if(doc.data().user_type == 'professional'){
        res.json({
          name: doc.data().name,
          member_since: moment(
            doc.data().account_created_at.seconds * 1000
          ).format("MMMM Do YYYY"),
          last_update: moment(
            doc.data().account_updated_at.seconds * 1000
          ).format("MMMM Do YYYY, h:mm a"),
          occupation: doc.data().occupation,
          purpose: doc.data().purpose,
          qualification: doc.data().qualification
        });
      }
      else if(doc.data().user_type == 'staff'){
        res.json({
          name: doc.data().name,
          member_since: moment(
            doc.data().account_created_at.seconds * 1000
          ).format("MMMM Do YYYY"),
          last_update: moment(
            doc.data().account_updated_at.seconds * 1000
          ).format("MMMM Do YYYY, h:mm a"),
          admin: doc.data().admin
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
}

//for update profile
const updateProfile = (req, res) => {
  let email = req.body.email;
  let userRef = db.collection("users").doc(email);
  let getDoc = userRef.get()
  .then(doc => {
    if(doc.exists){
    //user exists
      if(doc.data().user_type == 'client'){
        let updateProfile = userRef.update({
          name: req.body.name
        });
        //update account update time
        let updateAccountUpdateTime = userRef.update({account_updated_at: admin.firestore.Timestamp.now()});
      }
      else if(doc.data().user_type == 'professional'){
        let updateProfile = userRef.update({
          name: req.body.name,
          occupation: req.body.occupation,
          purpose: req.body.purpose,
          qualification: req.body.qualification
        });
        //update account update time
        let updateAccountUpdateTime = userRef.update({account_updated_at: admin.firestore.Timestamp.now()});
      }
	  res.set({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      res.sendStatus(200);
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
}

module.exports = {
  login: login,
  signup: signup,
  verifyEmail: verifyEmail,
  resetPassword: resetPassword,
  closeAccount: closeAccount,
  changePassword: changePassword,
  dashboard: dashboard,
  updateProfile: updateProfile
};