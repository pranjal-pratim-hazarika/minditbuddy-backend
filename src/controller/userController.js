const { admin } = require('../config/firebaseConfig.js');
const db = admin.firestore();
const moment = require("moment");

//for add feedback
const addFeedback = (req, res) => {
    let email = req.body.email;
    let feedback = req.body.feedback;
    let addDoc = db.collection('feedbacks').add({
        feedback: feedback,
        user: email,
        time: admin.firestore.Timestamp.now()
    }).then(ref => {
        res.set({
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        });
        res.sendStatus(201);
    });
}

//for view feedback
const viewNotification = (req, res) => {
    let user_type = req.query.user_type;
    let data = [];
    let notificationRef = db.collection('notifications');
    let query = notificationRef.where('user', '==', user_type).get()
    .then(snapshot => {
        if (snapshot.empty) {
            res.set({
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            });
            res.sendStatus(404);
        }  
        snapshot.forEach(doc => {
            let tempData = {
                notification: doc.data().notification,
                url: doc.data().url,
                time: moment(
                    doc.data().time.seconds * 1000
                  ).format("MMMM Do YYYY, h:mm a")
            };
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
    addFeedback: addFeedback,
    viewNotification: viewNotification
};