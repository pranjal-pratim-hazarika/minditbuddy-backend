const { admin } = require('../config/firebaseConfig.js');
const db = admin.firestore();
const bcrypt = require('bcrypt');
const moment = require("moment");

const clientRef = db.collection("statistics").doc("client");
const professionalRef = db.collection("statistics").doc("professional");

//for add staff
const addStaff = (req, res) => {
    let name = req.body.name;
    let email = req.body.staffEmail;
    let password = req.body.password;
    let isAdmin = req.body.admin;

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
          user_type: 'staff',
          admin: isAdmin,
          account_created_at: admin.firestore.Timestamp.now(),
          account_updated_at: '',
          recent_login: '',
          otp: '',
          status: 'active'
        };
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
}

//for suspend staff
const suspendStaff = (req, res) => {
    let email = req.body.staffEmail;

    let userRef = db.collection("users").doc(email);
    let getDoc = userRef.get()
    .then(doc => {
      //update status
      let updateStatus = userRef.update({
        status: 'suspended'
      });
      //update account update time
      let updateAccountUpdateTime = userRef.update({account_updated_at: admin.firestore.Timestamp.now()});

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
}

//for view staff
const viewStaff = (req,res) => {
    let data = [];
    let userRef = db.collection("users");
    let query = userRef.where('user_type', '==', 'staff').get()
    .then(snapshot => {
        snapshot.forEach(doc => {
            let tempData = {
                name: doc.data().name,
                email: doc.data().email,
                admin: doc.data().admin,
                account_created: moment(
                    doc.data().account_created_at.seconds * 1000
                  ).format("MMMM Do YYYY, h:mm a"),
                account_updated: moment(
                    doc.data().account_updated_at.seconds * 1000
                  ).format("MMMM Do YYYY, h:mm a"),
                recent_login: moment(
                    doc.data().recent_login.seconds * 1000
                  ).format("MMMM Do YYYY, h:mm a"),
                status: doc.data().status
            }
            data.push(tempData);
        });
        res.set({
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        });
        res.json(data);
    })
    .catch(err => {
    //error getting user
      res.set({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      res.sendStatus(500);
    });
}

//for search user
const searchUser = (req,res) => {
    let email = req.query.email;
    let userRef = db.collection("users").doc(email);
    let getDoc = userRef.get()
    .then(doc => {
        if (!doc.exists) {
            //user doesnot exist
            res.set({
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
           });
           res.sendStatus(404);
        } else {
            let data = {
                name: doc.data().name,
                email: doc.data().email,
                user_type: doc.data().user_type,
                account_created: moment(
                    doc.data().account_created_at.seconds * 1000
                  ).format("MMMM Do YYYY, h:mm a"),
                account_updated: moment(
                    doc.data().account_updated_at.seconds * 1000
                  ).format("MMMM Do YYYY, h:mm a"),
                recent_login: moment(
                    doc.data().recent_login.seconds * 1000
                  ).format("MMMM Do YYYY, h:mm a"),
                status: doc.data().status
            }
            res.set({
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            });
            res.json(data);
        }
    })
    .catch(err => {
    //error getting user
      res.set({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      res.sendStatus(500);
    });
}

//view feedback
const viewFeedback = (req, res) => {
  let data = [];
  let feedbackRef = db.collection('feedbacks');
  let allFeedbacks = feedbackRef.get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      let tempData = {
        user: doc.data().user,
        feedback: doc.data().feedback,
        time: moment(
          doc.data().time.seconds * 1000
        ).format("MMMM Do YYYY, h:mm a")
      }
      data.push(tempData);
    });
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.json(data);
  })
  .catch(err => {
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.sendStatus(500);
  });
}

//for add notification
const addNotification = (req, res) => {
  let email = req.body.email;
  let notification = req.body.notification;
  let url = req.body.url;
  let user = req.body.user;
  let addDoc = db.collection('notifications').add({
    email: email,
    notification: notification,
    url: url,
    user: user,
    time: admin.firestore.Timestamp.now()
  }).then(ref => {
    res.set({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    });
    res.sendStatus(201);
  });
}

//for suspend user
const suspendUser = (req, res) => {
  let email = req.body.email;

  let userRef = db.collection("users").doc(email);
  let getDoc = userRef.get()
  .then(doc => {
    //update status
    let updateStatus = userRef.update({
      status: 'suspended'
    });
    //update account update time
    let updateAccountUpdateTime = userRef.update({account_updated_at: admin.firestore.Timestamp.now()});

    //update statistics
    if(doc.data().user_type == 'client'){
      let getDoc = clientRef.get()
      .then(doc => {
        let newActive = eval(doc.data().active - 1);
        let newSuspended = eval(doc.data().suspended + 1);
        let updateStatistics = clientRef.update({
          active: newActive,
          suspended: newSuspended
        });
      })
    }
    else if(doc.data().user_type == 'professional'){
      let getDoc = professionalRef.get()
      .then(doc => {
        let newActive = eval(doc.data().active - 1);
        let newSuspended = eval(doc.data().suspended + 1);
        let updateStatistics = professionalRef.update({
          active: newActive,
          suspended: newSuspended
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
}

//for user statistics
const statistics = (req, res) => {
  let data = [];
  let statisticsRef = db.collection('statistics');
  let allStatistics = statisticsRef.get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      let tempData = {
        user_type: doc.id,
        data: doc.data()
      }
      data.push(tempData);
    });
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.json(data);
  })
  .catch(err => {
    res.set({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.sendStatus(500);
  });
}

module.exports = {
    addStaff: addStaff,
    suspendStaff: suspendStaff,
    viewStaff: viewStaff,
    searchUser: searchUser,
    viewFeedback: viewFeedback,
    addNotification: addNotification,
    suspendUser: suspendUser,
    statistics: statistics
};