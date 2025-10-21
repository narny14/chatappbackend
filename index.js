import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import admin from "firebase-admin";
import fs from "fs";

// Charger le fichier JSON manuellement
const serviceAccount = JSON.parse(fs.readFileSync("./firebase-service-account.json", "utf8"));

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔥 Initialisation de Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 📨 Route pour envoyer une notification
app.post("/send-notification", async (req, res) => {
  try {
    const { token, title, body } = req.body;

    const message = {
      notification: { title, body },
      token,
    };

    const response = await admin.messaging().send(message);
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error("Erreur FCM:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur FCM lancé sur http://localhost:${PORT}`));
