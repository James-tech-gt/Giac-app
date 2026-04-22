// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBu4lUWVxVEdD9uNsMKVtl_xgWtHWz-Y3Q",
  authDomain: "giac-app-9752c.firebaseapp.com",
  projectId: "giac-app-9752c",
  storageBucket: "giac-app-9752c.firebasestorage.app",
  messagingSenderId: "529116845053",
  appId: "1:529116845053:web:f93487b3eab46af5083f94",
  measurementId: "G-HLK3MMB77H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;