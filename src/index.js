const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const Filter = require("bad-words");
const messageUtils = require("./utils/messages");
const userUtils = require("./utils/users");

require("dotenv").config();

const app = express();
app.use(express.static(path.join(__dirname, "../public")));

const server = http.createServer(app);
const io = socketIo(server);

io.on("connection", (socket) => {
  socket.on("join", ({ username, room }, callback) => {
    const { user, error } = userUtils.addUser({
      id: socket.id,
      username,
      room,
    });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);
    socket.emit("message", messageUtils.generateMessage("system", "Welcome!"));

    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        messageUtils.generateMessage(
          "system",
          `${user.username} has joined the chat`
        )
      );

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: userUtils.getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", ({ message }, callback) => {
    const filter = new Filter();
    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed!");
    }
    const user = userUtils.getUser(socket.id);
    io.to(user.room).emit(
      "message",
      messageUtils.generateMessage(user.username, message)
    );
    callback();
  });

  socket.on("share-location", (coordinates, callback) => {
    const user = userUtils.getUser(socket.id);
    io.emit(
      "location-shared",
      messageUtils.generateLocationMessage(
        user.username,
        `https://google.com/maps/?q=${coordinates.lat},${coordinates.long}`
      )
    );
    callback();
  });

  socket.on("disconnect", (reason) => {
    console.log(reason);
    const user = userUtils.removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        messageUtils.generateMessage(
          "System",
          `${user.username} has left the chat`
        )
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: userUtils.getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server started at port ${process.env.PORT}`);
});
