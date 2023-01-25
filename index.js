const http = require('http');
const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
const cors = require('cors');
const socketio = require("socket.io");

dotenv.config();
connectDB();
const app = express();

app.use(express.json()); // to accept json data

// // For CORS Errors
// app.use((req, res, next) => {
//   // CORS headers
//   res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
//   res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
//   // Set custom headers for CORS

//   res.header("Access-Control-Allow-Headers", 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Custom-Header');

//   if (req.method === "OPTIONS") {
//     return res.status(200).end();
//   }
//   next();
// });

// app.options('*', cors());
app.use(cors());

// app.use(cors({
//   origin:"https://chat-nexus.netlify.app",

// }));
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// --------------------------deployment------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// --------------------------deployment------------------------------

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// const server = app.listen(
//   PORT,
//   console.log(`Server running on PORT ${PORT}...`.yellow.bold)
// );


const server = http.createServer(app);

const io = socketio(server, {
  pingTimeout: 60000,
  cors: {
    origin: ["*", "http://localhost:3000", 'https://chat-nexus.netlify.app/chats', 'https://chat-nexus.netlify.app'],
  }
});
// const io = new Server(server, {
//   // const io = require("socket.io")(server, {
//   pingTimeout: 60000,
//   cors: {
//     origin: ["*", "http://localhost:3000", 'https://chat-nexus.netlify.app/chats', 'https://chat-nexus.netlify.app'],
//   },
//   handlePreflightRequest: (req, res) => {
//     res.writeHead(200, {
//       "Access-Control-Allow-Origin":"*",
//       "Access-Control-Allow-Methods":"GET, POST",
//       "Access-Control-Allow-Headers":"my-custom-header",
//       "Access-Control-Allow-Credentials":true
//     });
//     res.end();
//   }
// });

io.on("connection", (socket) => {
  socket.on('error', function (err) {
    console.log("Socket.IO Error");
    console.log(err.stack); // this is changed from your code in last comment
  });

  console.log("Connected to socket.io");
  socket.on("setup", (userData) => {
    console.log(userData);
    socket.join(userData?._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});


server.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`.yellow.bold)
);
