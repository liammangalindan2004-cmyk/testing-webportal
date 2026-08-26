import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDI9ziVzajecsq7Ab4NPeCFb3VLDsa35UU",
  authDomain: "unmei-nihongo-center.firebaseapp.com",
  projectId: "unmei-nihongo-center",
  storageBucket: "unmei-nihongo-center.firebasestorage.app",
  messagingSenderId: "357352911990",
  appId: "1:357352911990:web:91994d403c6153db635b57"
};
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Phase 8 migration: Cloud Firestore replaces Realtime Database
export const firestore = getFirestore(app);
