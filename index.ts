import express, { Express, Request, Response } from "express";
import { explode } from "./boom";
const app: Express = express();
const port: number = 8000;
const http = require("http");
const server = http.createServer(app);
import { Socket, ServerOptions } from "socket.io";
const io = require("socket.io")(server);
const cp = require("cookie-parser");
import { Database } from "key-value-database";
const { listOrganizer } = require("./listOrganizer.js");
const users = new Database<User>("Users", "./db/", false);
const rooms = new Database<Room>("Rooms", "./db/", false);

class User {
  username: string;
  id: string;
  orderedOptions: Array<any> = new Array<any>();
  ready: boolean = false;
  constructor(username: string) {
    this.username = username;
    this.id = genUserId();
  }
}

class Room {
  id: string;
  pass: string;
  users: Array<User> = new Array<User>();
  ready: number;
  options: Array<any> = new Array<any>();
  constructor(pass: string) {
    this.id = genRoomId();
    this.pass = pass;
    this.ready = 0;
  }
  deleteUser(userId: string): void {
    for (let i = 0; i < this.users.length; i++) {
      if (this.users[i].id === userId) {
        removeIndexFromArray(this.users, i);
        return;
      }
    }
  }
}

function genRoomId(): string {
  let id = Math.floor(Math.random() * 100000000).toString();
  let found = rooms.Exists(id);
  if (!found) {
    return id;
  } else {
    return genRoomId();
  }
}

function removeIndexFromArray(arr: Array<any>, ind: number) {
  return arr.slice(0, ind).concat(arr.slice(ind + 1, ind + 2));
}

function genUserId(): string {
  let id = Math.floor(Math.random() * 100000000).toString();
  let found = users.Exists(id);
  if (!found) {
    return id;
  } else {
    return genUserId();
  }
}

function createListFromRoom(room: Room) {
  let newList = [];
  for (let i = 0; i < room.users.length; i++) {
    newList.push(room.users[i].orderedOptions);
  }
  return newList;
}

app.set("view engine", "ejs");
app.use(cp());
app.use("/scripts", express.static("scripts"));
app.use("/styles", express.static("styles"));
app.use(express.urlencoded({ extended: true }));

app.get("/", async (_, res) => {
  res.sendFile(__dirname + "/pages/index.html");
});

app.post("/create", async (req: Request, res: Response) => {
  console.log(req.body);
  let room: Room = new Room(req.body.pass);
  let user: User = new User(req.body.username);
  room.users.push(user);
  await rooms.Set(room.id, room);
  await users.Set(user.id, user);
  res.cookie("ID", user.id, { expires: new Date(Date.now() + 1000 * 60 * 60) });
  res.redirect(`./rooms/${room.id}`);
});

app.post("/join", (req: Request, res: Response) => {
  if (!rooms.Exists(req.body.ID)) {
    res.send("Wrong room ID!");
    return;
  }
  rooms.Get(req.body.ID).then((room: Room | undefined) => {
    if (!room) {
      return;
    }
    if (room.pass !== req.body.pass) {
      res.send("Wrong password!");
      return;
    }
    let user: User = new User(req.body.username);
    room.users.push(user);
    explode(users.Set(user.id, user), () => {});
    res.cookie("ID", user.id, {
      expires: new Date(Date.now() + 1000 * 60 * 60),
    });
    res.redirect(`./rooms/${room.id}`);
  });
});
// document.baseURI.split("/rooms/")[1]
app.get("/rooms/:id", async (req: Request, res: Response) => {
  if (!rooms.Exists(req.params.id)) {
    res.send("Wrong room number!");
    return;
  }
  res.sendFile(__dirname + "/pages/room.html");
});

server.listen(port, (err: Error) => {
  if (err) {
    console.log(err);
  }
  console.log(port);
});

io.on("connection", (client: Socket) => {
  client.on("register", (obj) => {
    client.join(obj.roomId);
    rooms.Get(obj.roomId).then((room: Room | undefined) => {
      if (!room) {
        return;
      }
      client.emit("startupList", { list: room.options });
    });
  });
  client.on("done", (obj) => {
    users.Get(obj.clientId).then((usr: User | undefined) => {
      if (!usr) {
        return;
      }
      usr.orderedOptions = obj.list;
      if (!usr.ready) {
        usr.ready = true;
        rooms.Get(obj.roomId).then((room: Room | undefined) => {
          if (!room) {
            return;
          }
          room.ready++;
          console.log("Room ready: ", room.ready);
          console.log("Room users: ", room.users.length);
          if (room.users.length === room.ready) {
            room.ready = 0;
            console.log("Ordered options");
            room.users.forEach((user: User) => {
              user.ready = false;
              console.log(user.orderedOptions);
            });
            let organizer = new listOrganizer(createListFromRoom(room));
            io.to(obj.roomId).emit("picked", {
              picked: organizer.organize(),
            });
          }
        });
      }
    });
  });
  client.on("addOption", (obj) => {
    client.to(obj.roomId).emit("addOption", obj.value);
    rooms.Get(obj.roomId).then((room: Room | undefined) => {
      if (!room) {
        return;
      }
      room.options.push(obj.value);
    });
  });
  client.on("exiting", (obj) => {
    console.log("Disconnecting...", client.rooms);
    explode(users.Delete(obj.clientId), () => {
      console.log("Deleted: ", obj.clientId);
    });
    rooms.Get(obj.roomId).then((room: Room | undefined) => {
      if (!room) {
        return;
      }
      room.deleteUser(obj.clientId);
      console.log(room);
    });
  });
});
