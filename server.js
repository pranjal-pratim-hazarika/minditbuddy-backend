require("dotenv").config({ path: "./config/.env" });

const port = process.env.PORT;
const route = process.env.ROUTE;

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require('cors');
//------------Chat-Socket.io-------------------//
const server = require('http').Server(app)
const io = require('socket.io')(server)
//------------Chat-Socket.io-------------------//

//import middleware and controllers
const middleware = require("./middleware/middleware.js");
const authController = require("./controller/authController.js");
const staffController = require("./controller/staffController.js");
const userController = require("./controller/userController.js");

function start() {
  //------------Chat-Socket.io-------------------//
  app.set('views', './views')
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
let rooms = {}
  //------------Chat-Socket.io-------------------//
  /* app.use(
    bodyParser.urlencoded({
      extended: false
    })
  ); */
  app.use(bodyParser.json());
  app.use(cors());

  server.listen(port, function() {
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
  //for suspend user
  app.post(route + "/suspendUser", middleware.checkToken, staffController.suspendUser);
  //for user statistics
  app.get(route + "/statistics", middleware.checkToken, staffController.statistics);

  //for add feedback
  app.post(route + "/addFeedback", middleware.checkToken, userController.addFeedback);
  //for view notification
  app.get(route + "/viewNotification", middleware.checkToken, userController.viewNotification);
  //for post issue
  app.post(route + "/postIssue", middleware.checkToken, userController.postIssue);


  //------------Chat-Socket.io-------------------//
  

  app.get('/users', (req, res) => {
    res.render('users', { roomList: rooms, name: req.query.name })
  })

  app.get('/createChat', (req, res) => {
    let email = req.query.email;
    let time = req.query.time;
    let name = req.query.name;
    let roomName = email+'_'+time;
    if (rooms[roomName] != null) {
      return res.redirect('/')
    }
    rooms[roomName] = { users: {}, client: name, count: 0 }
    res.redirect('/joinChat?room='+roomName+'&name='+name)
    // Send message that new room was created
    io.emit('room-created', roomName, name)
  })

  app.get('/joinChat', (req, res) => {
    if (rooms[req.query.room] == null) {
      return res.redirect('/')
    }
    res.render('room', { roomName: req.query.room , name: req.query.name})
  })

  io.on('connection', socket => {
    socket.on('new-user', (room, name) => {
      socket.join(room)
      rooms[room].users[socket.id] = name
      rooms[room].count = rooms[room].count + 1
      console.log(rooms);
      socket.to(room).broadcast.emit('user-connected', name)
    })
    socket.on('send-chat-message', (room, message) => {
      socket.to(room).broadcast.emit('chat-message', { message: message, name: rooms[room].users[socket.id] })
    })
    socket.on('disconnect', () => {
      getUserRooms(socket).forEach(room => {
        socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
        delete rooms[room].users[socket.id]
      })
    })
  })

  function getUserRooms(socket) {
    return Object.entries(rooms).reduce((names, [name, room]) => {
      if (room.users[socket.id] != null) names.push(name)
      return names
    }, [])
  }
  //------------Chat-Socket.io-------------------//
}

start();