import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import admin from "firebase-admin";

// ✅ Configuration via variables d’environnement Render
const serviceAccount = {
  type: process.env.FB_TYPE,
  project_id: process.env.FB_PROJECT_ID,
  private_key_id: process.env.FB_PRIVATE_KEY_ID,
  private_key: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FB_CLIENT_EMAIL,
  client_id: process.env.FB_CLIENT_ID,
  auth_uri: process.env.FB_AUTH_URI,
  token_uri: process.env.FB_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FB_AUTH_CERT_URL,
  client_x509_cert_url: process.env.FB_CLIENT_CERT_URL,
};

// 🔥 Initialisation Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log("🔥 Firebase Admin initialisé avec succès !");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 📨 Route pour envoyer une notification
app.post("/send-notification", async (req, res) => {
  try {
    const { token, title, body } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({ success: false, error: "Champs manquants (token, title, body)" });
    }

    const message = {
      notification: { title, body },
      token,
    };

    const response = await admin.messaging().send(message);
    console.log("📩 Notification envoyée :", response);
    res.status(200).json({ success: true, response });

  } catch (error) {
    console.error("❌ Erreur FCM:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur FCM lancé sur le port ${PORT}`));
