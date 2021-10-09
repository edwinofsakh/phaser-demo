const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);

const PORT = 3000;

app.use(cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json());

app.post('/login', (req, res) => {
    res.send({ token: 'Hello World!' });
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

const io = new Server(httpServer, { cors: {} });

io.on('connection', (socket) => {
    console.log('Connected');

    console.log('id', socket.id);
    console.log('handshake', socket.handshake);
    console.log('rooms', socket.rooms);
    console.log('data', socket.data);

    socket.use(([event, ...args], next) => {
        console.log('use', event, ...args);
        next(new Error('test'));
    });

    socket.on("error", (err) => {
        if (err && err.message === 'Unauthorized') {
            socket.disconnect();
        } else{
            socket.emit('error', 'AAA');
        }
    });

    // socket.onAny((event, ...args) => {
    //     console.log('any', event, ...args);
    // });
});

io.use((socket, next) => {
    if (isUnauthorized(socket)) {
        console.log('Unauthorized')
        return next(new Error('Unauthorized'));
    }
    // do not forget to call next
    next();
});

function isUnauthorized(socket) {
    return socket.handshake.auth.token !== 'ABC';
}

setInterval(() => {
    io.emit('time', new Date());
}, 5000);

httpServer.listen(PORT, () => {
    console.log(`Example app listening at http://localhost:${PORT}`);
});