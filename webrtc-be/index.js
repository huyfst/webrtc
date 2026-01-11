const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors({ origin: [process.env.CLIENT_URL] }));
app.use(express.json());

const db = [
    { name: 'huy', userId: 1 },
    { name: 'nam', userId: 2 },
];

app.post('/login', (req, res) => {
    db.map((user) => {
        if (user.name == req.body.name) {
            res.json(user.userId);
        }
    });
});

const server = app.listen(3000, () => {
    console.log('server listen on port 3000');
});

const io = new Server(server, { cors: { origin: [process.env.CLIENT_URL] } });
io.on('connection', (socket) => {
    socket.join(JSON.parse(socket.handshake.query.userId));
    console.log('socket join > ', socket.handshake.query.userId);

    socket.on('message offer', (data) => {
        console.log('receive offer > ', data);
        socket.to(data.userId).emit('message offer', { offer: data.offer });
    });

    socket.on('message answer', (data) => {
        console.log('receive answer > ', data);
        socket.to(data.userId).emit('message answer', { answer: data.answer });
    });

    socket.on('message remote candidate', (data) => {
        console.log('receive candidate > ', data);
        socket.to(data.userId).emit('message remote candidate', {
            iceCandidate: data.iceCandidate,
        });
    });

    socket.on('message local candidate', (data) => {
        console.log('receive candidate > ', data);
        socket.to(data.userId).emit('message local candidate', {
            iceCandidate: data.iceCandidate,
        });
    });
});
