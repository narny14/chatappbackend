const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Message = require('./models/Message');
const sequelize = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());

const SECRET = 'tonsecretjwt';

// 🔹 Authentification
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hash });
  res.json(user);
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Wrong password' });

  const token = jwt.sign({ id: user.id, email }, SECRET, { expiresIn: '7d' });
  user.token = token;
  await user.save();

  res.json({ token });
});

// 🔹 Socket.IO - Chat temps réel
io.on('connection', socket => {
  console.log('Utilisateur connecté');

  socket.on('sendMessage', async data => {
    const msg = await Message.create(data);
    io.emit('receiveMessage', msg);
  });

  socket.on('disconnect', () => console.log('Utilisateur déconnecté'));
});

// 🔹 Synchronisation BD
sequelize.sync().then(() => {
  console.log('Base MySQL prête');
  server.listen(3000, () => console.log('Serveur sur port 3000'));
});
