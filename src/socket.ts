// Import socket io 
import { io } from "socket.io-client";

const url = "http://localhost:3000";
export const socket = io(url, {
    auth: {
        username: "A",
        password: "B",
        token: "ABC"
    }
});

let gCount = 0;

setInterval(() => {
    if (!socket.disconnected) {
        socket.emit("hello", "world #" + (gCount++));
    }
}, 10000);

socket.on("connect", () => {
    console.log("Socket connected");
    socket.emit("hello", "world #" + (gCount++));
});

socket.on("disconnect", () => {
    console.log("Socket disconnected");
});

// listen for event
socket.on("hello", (data) => { console.log("hello", data) });

// emit event
socket.emit("hello", "world");

interface MessageConnect {
    auth: {
        username: string;
        password: string;
        token: string;
    }
}

interface MessageTilemap {
    center: [number, number],
    initial: boolean,
}