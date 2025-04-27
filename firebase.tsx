// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore"; // Firestore import edildi
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBxqQGr9HYsDNdiv8BNjUwy8NDoD1ZQjEM",
  authDomain: "loginscreenfirebase-55198.firebaseapp.com",
  projectId: "loginscreenfirebase-55198",
  storageBucket: "loginscreenfirebase-55198.appspot.com",
  messagingSenderId: "63361277261",
  appId: "1:63361277261:web:1478cb146aaa5147966b04"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with *disabled* offline persistence
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// Get auth
const auth = getAuth(app);

export { auth, db, app };
