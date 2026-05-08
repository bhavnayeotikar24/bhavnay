import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const adminApp = admin.apps.length 
  ? admin.app() 
  : admin.initializeApp({
      projectId: firebaseConfig.projectId,
      databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com` // Optional but sometimes helps
    });

const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(adminApp);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes can be added here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route to update an admin record and password
  app.post("/api/admins/update", async (req, res) => {
    const { uid, adminId, password } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      console.log(`Updating admin record for UID/ID: ${uid}`);
      
      if (password) {
        await auth.updateUser(uid, { password });
      }

      if (adminId) {
        // Use set with merge to be more robust than update
        await db.collection("admins").doc(uid).set({ adminId }, { merge: true });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating admin record in server:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
