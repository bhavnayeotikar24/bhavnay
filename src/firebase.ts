import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBskQZjQpe7t-JkRrh3z--XBi9F7pjUkTQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "biocom-portal-23dbd.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "biocom-portal-23dbd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "biocom-portal-23dbd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "8264478954",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:8264478954:web:f72ebe46fc62a474a06793"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export default app;
