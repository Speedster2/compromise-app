"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const boom_1 = require("./boom");
const app = (0, express_1.default)();
const port = 8000;
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server);
const cp = require("cookie-parser");
const key_value_database_1 = require("key-value-database");
const { listOrganizer } = require("./listOrganizer.js");
const users = new key_value_database_1.Database("Users", "./db/", false);
const rooms = new key_value_database_1.Database("Rooms", "./db/", false);
class User {
    constructor(username) {
        this.orderedOptions = new Array();
        this.ready = false;
        this.username = username;
        this.id = genUserId();
    }
}
class Room {
    constructor(pass) {
        this.users = new Array();
        this.options = new Array();
        this.id = genRoomId();
        this.pass = pass;
        this.ready = 0;
    }
    deleteUser(userId) {
        for (let i = 0; i < this.users.length; i++) {
            if (this.users[i].id === userId) {
                removeIndexFromArray(this.users, i);
                return;
            }
        }
    }
}
function genRoomId() {
    let id = Math.floor(Math.random() * 100000000).toString();
    let found = rooms.Exists(id);
    if (!found) {
        return id;
    }
    else {
        return genRoomId();
    }
}
function removeIndexFromArray(arr, ind) {
    return arr.slice(0, ind).concat(arr.slice(ind + 1, ind + 2));
}
function genUserId() {
    let id = Math.floor(Math.random() * 100000000).toString();
    let found = users.Exists(id);
    if (!found) {
        return id;
    }
    else {
        return genUserId();
    }
}
function createListFromRoom(room) {
    let newList = [];
    for (let i = 0; i < room.users.length; i++) {
        newList.push(room.users[i].orderedOptions);
    }
    return newList;
}
app.set("view engine", "ejs");
app.use(cp());
app.use("/scripts", express_1.default.static("scripts"));
app.use("/styles", express_1.default.static("styles"));
app.use(express_1.default.urlencoded({ extended: true }));
app.get("/", async (_, res) => {
    res.sendFile(__dirname + "/pages/index.html");
});
app.post("/create", async (req, res) => {
    console.log(req.body);
    let room = new Room(req.body.pass);
    let user = new User(req.body.username);
    room.users.push(user);
    await rooms.Set(room.id, room);
    await users.Set(user.id, user);
    res.cookie("ID", user.id, { expires: new Date(Date.now() + 1000 * 60 * 60) });
    res.redirect(`./rooms/${room.id}`);
});
app.post("/join", (req, res) => {
    if (!rooms.Exists(req.body.ID)) {
        res.send("Wrong room ID!");
        return;
    }
    rooms.Get(req.body.ID).then((room) => {
        if (!room) {
            return;
        }
        if (room.pass !== req.body.pass) {
            res.send("Wrong password!");
            return;
        }
        let user = new User(req.body.username);
        room.users.push(user);
        (0, boom_1.explode)(users.Set(user.id, user), () => { });
        res.cookie("ID", user.id, {
            expires: new Date(Date.now() + 1000 * 60 * 60),
        });
        res.redirect(`./rooms/${room.id}`);
    });
});
// document.baseURI.split("/rooms/")[1]
app.get("/rooms/:id", async (req, res) => {
    if (!rooms.Exists(req.params.id)) {
        res.send("Wrong room number!");
        return;
    }
    res.sendFile(__dirname + "/pages/room.html");
});
server.listen(port, (err) => {
    if (err) {
        console.log(err);
    }
    console.log(port);
});
io.on("connection", (client) => {
    client.on("register", (obj) => {
        client.join(obj.roomId);
        rooms.Get(obj.roomId).then((room) => {
            if (!room) {
                return;
            }
            client.emit("startupList", { list: room.options });
        });
    });
    client.on("done", (obj) => {
        users.Get(obj.clientId).then((usr) => {
            if (!usr) {
                return;
            }
            usr.orderedOptions = obj.list;
            if (!usr.ready) {
                usr.ready = true;
                rooms.Get(obj.roomId).then((room) => {
                    if (!room) {
                        return;
                    }
                    room.ready++;
                    console.log("Room ready: ", room.ready);
                    console.log("Room users: ", room.users.length);
                    if (room.users.length === room.ready) {
                        room.ready = 0;
                        console.log("Ordered options");
                        room.users.forEach((user) => {
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
        rooms.Get(obj.roomId).then((room) => {
            if (!room) {
                return;
            }
            room.options.push(obj.value);
        });
    });
    client.on("exiting", (obj) => {
        console.log("Disconnecting...", client.rooms);
        (0, boom_1.explode)(users.Delete(obj.clientId), () => {
            console.log("Deleted: ", obj.clientId);
        });
        rooms.Get(obj.roomId).then((room) => {
            if (!room) {
                return;
            }
            room.deleteUser(obj.clientId);
            console.log(room);
        });
    });
});
