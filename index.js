// index.js - Backend complet (Express + Firebase FCM + Socket.IO + MySQL)
require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const admin = require("firebase-admin");
const { Sequelize, DataTypes } = require("sequelize");

// 🟢 Connexion MySQL (Railway ou Render)
const sequelize = new Sequelize(
  process.env.DB_NAME || "chatdb",
  process.env.DB_USER || "root",
  process.env.DB_PASS || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false,
  }
);

// 🟢 Modèles Sequelize
const User = sequelize.define("User", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING,
  name: DataTypes.STRING,
  profileImage: DataTypes.STRING,
  fcmToken: DataTypes.STRING,
});

const Message = sequelize.define("Message", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  senderId: DataTypes.INTEGER,
  receiverId: DataTypes.INTEGER,
  content: DataTypes.TEXT,
});

// 🟢 Firebase Admin (via variables Render)
const serviceAccount = {
  type: process.env.FB_TYPE,
  project_id: process.env.FB_PROJECT_ID,
  private_key_id: process.env.FB_PRIVATE_KEY_ID,
  private_key: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.FB_CLIENT_EMAIL,
  client_id: process.env.FB_CLIENT_ID,
  auth_uri: process.env.FB_AUTH_URI,
  token_uri: process.env.FB_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FB_AUTH_CERT_URL,
  client_x509_cert_url: process.env.FB_CLIENT_CERT_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
console.log("🔥 Firebase Admin initialisé avec succès !");

// 🟢 Express + Socket.IO
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(bodyParser.json());
const SECRET = process.env.JWT_SECRET || "monsecretjwt";

// --- Enregistrement
app.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Champs manquants" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hash, name });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- Connexion
app.post("/login", async (req, res) => {
  try {
    const { email, password, fcmToken } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Mot de passe incorrect" });

    // 🔥 Enregistre le token FCM
    if (fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }

    const token = jwt.sign({ id: user.id, email }, SECRET, { expiresIn: "7d" });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Test manuel de notification
app.post("/send-notification", async (req, res) => {
  try {
    const { token, title, body, image } = req.body;
    if (!token || !title || !body)
      return res.status(400).json({ success: false, error: "Champs manquants" });

    const message = {
      notification: { title, body },
      token,
    };
    if (image) message.notification.image = image;

    const response = await admin.messaging().send(message);
    console.log("📩 Notification envoyée :", response);
    res.json({ success: true, response });
  } catch (error) {
    console.error("❌ Erreur FCM:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Socket.IO (chat + notification)
io.on("connection", (socket) => {
  console.log("👤 Utilisateur connecté:", socket.id);

  socket.on("sendMessage", async (data) => {
    try {
      const { senderId, receiverId, content } = data;
      if (!senderId || !receiverId || !content) return;

      const message = await Message.create({ senderId, receiverId, content });
      io.emit("receiveMessage", message);

      // 🔔 Notification push
      const receiver = await User.findByPk(receiverId);
      const sender = await User.findByPk(senderId);

      if (receiver?.fcmToken) {
        const notif = {
          notification: {
            title: `${sender?.name || "Quelqu'un"} t'a envoyé un message`,
            body: content,
            image: sender?.profileImage || undefined,
          },
          token: receiver.fcmToken,
        };

        await admin.messaging().send(notif);
        console.log("✅ Notification envoyée via Socket");
      }
    } catch (err) {
      console.error("Erreur socket:", err);
    }
  });

  socket.on("disconnect", () => console.log("❌ Déconnecté:", socket.id));
});

// --- Lancement serveur
(async () => {
  await sequelize.sync({ alter: true });
  console.log("✅ Base MySQL prête !");
  const PORT = process.env.PORT || 10000;
  server.listen(PORT, () =>
    console.log(`🚀 Serveur complet lancé sur le port ${PORT}`)
  );
})();
