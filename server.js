'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

// import libraries
let session = require('express-session');
const routes = require('./routes.js');
const auth = require('./auth.js');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const passportSocketIo = require('passport.socketio');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
// import libraries

// Set io
io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,
  key: 'express.sid',
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({ mongoUrl: process.env.MONGO_URI }),
  success: onAuthorizeSuccess,
  fail: onAuthorizeFail
}));
// Set io

// Set template engine
app.set("view engine", "pug");
app.set("views", "./views/pug");
// Set template engine

// set libraries up
app.use(session({
  key: 'express.sid',
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({ mongoUrl: process.env.MONGO_URI }),
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));
// set libraries up

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Working with database
myDB(async client => {
  const myDataBase = await client.db('database').collection('users');

  routes(app, myDataBase);
  auth(app, myDataBase);

  let currentUsers = 0;
  io.on('connection', socket => {
    ++currentUsers;
    io.emit(
      'user',
      {
        username: socket.request.user.username,
        currentUsers: currentUsers,
        connected: true
      }
    );

    socket.on('disconnect', () => {
      --currentUsers;
      io.emit(
        'user',
        {
          username: socket.request.user.username,
          currentUsers: currentUsers,
          connected: false
        }
      );
    });

    io.on('chat message', message => {
      io.emit('chat message', {
        username: socket.request.user.username,
        message: message
      });
    });
  });

  // 404 execution middleware
  app.use((req, res, next) => {
    res.status(404).type('text').send('Not Found');
  });
  // 404 execution middleware
}).catch(err => {
  app.route('/').get((req, res) => {
    res.render('index', {
      title: err,
      message: 'Unable to connect to database'
    });
  });
});
// Working with database

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});

// onAuthorizeSuccess, onAuthorizeFail
function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');
  accept(null, true);
}

function onAuthorizeFail(data, message, err, accept) {
  if (err) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}
// onAuthorizeSuccess, onAuthorizeFail