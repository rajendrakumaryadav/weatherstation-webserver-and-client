const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const PORT = 8000;
// socket.io
 
const http = require('http')
const { Server } = require("socket.io");
app.use(bodyParser.json({ limit: "50mb", type: "application/json" }));

// http.createServer(app).listen(3000, () => {
//   console.log("Server started on port 3000");
// });

const io = new Server(3000, {
  cors: {
    'allowedHeaders': ['Content-Type', 'Authorization'],
    'preflightContinue': true,
    'origins': ['http://localhost:8000', 'http://192.168.0.106:8000'],
    'methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']

  }
});

io.on("connect", (socket) => {
  io.emit('user-connected', { message: 'User connected' });  
  console.log("User connected");
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
  socket.on("ack", (data) => {
    console.log(data.message);
    io.emit('ack_rev', { message: 'Ack received' });  
  });
});

// SQLite connection
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("weatherdata.db");

// adding proxy cors
const cors = require("cors");
app.use(cors());



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("dist"));
// template
app.set("view engine", "ejs");
// template directory
app.set("views", "views");
// setup database tble
db.serialize(function () {
  db.run(
    "CREATE TABLE IF NOT EXISTS weatherdata (temperature REAL, humidity REAL, timestamp DATETIME)"
  );
});


app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/api/v1/weatherdata", (req, res) => {
  // adding data to the req.body formatted
  req.body.timestamp = new Date();
  io.emit('data', { data: req.body });
  // current time
  var currentdate = new Date();
  var datetime =
    "Last Sync: " +
    currentdate.getDate() +
    "/" +
    (currentdate.getMonth() + 1) +
    "/" +
    currentdate.getFullYear() +
    " @ " +
    currentdate.getHours() +
    " : " +
    currentdate.getMinutes() +
    " : " +
    currentdate.getSeconds();
  // insert data into database temperature, humidity, timestamp
  db.run(
    `INSERT INTO weatherdata (temperature, humidity, timestamp) VALUES (${req.body.temperature}, ${req.body.humidity}, '${currentdate}')`
  );
  res.send(`Ack: Data received.\n${datetime}`);
});

app.get("/weatherdata", (req, res) => {
  let data = [];
  db.all("SELECT * FROM weatherdata ORDER BY timestamp DESC", (err, rows) => {
    rows.forEach((row) => {
      var date = new Date(row.timestamp);
      var formattedDate =
        date.getDate() +
        "/" +
        (date.getMonth() + 1) +
        "/" +
        date.getFullYear() +
        " " +
        date.getHours() +
        ":" +
        date.getMinutes() +
        ":" +
        date.getSeconds();
      row.timestamp = formattedDate;
      data.push(row);
    });
    res.render("weatherdata", { data: data });
  });
});


app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});