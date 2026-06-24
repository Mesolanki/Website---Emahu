import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDjb04loJJj7zDxBaMrzSUvl4mOjub27sY",
  authDomain: "emah-6f5d3.firebaseapp.com",
  projectId: "emah-6f5d3",
  storageBucket: "emah-6f5d3.firebasestorage.app",
  messagingSenderId: "243984442623",
  appId: "1:243984442623:web:4748ab44a07e2e4f4698ca",
  measurementId: "G-3ZDT53TPER"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
