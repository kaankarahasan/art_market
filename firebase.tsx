// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Firestore import edildi

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBxqQGr9HYsDNdiv8BNjUwy8NDoD1ZQjEM",
  authDomain: "loginscreenfirebase-55198.firebaseapp.com",
  projectId: "loginscreenfirebase-55198",
  storageBucket: "loginscreenfirebase-55198.appspot.com", // düzeltildi
  messagingSenderId: "63361277261",
  appId: "1:63361277261:web:1478cb146aaa5147966b04"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Firestore instance'ı oluşturuldu

export { auth, db, app };
