// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA_H_rGtLHa_WKzn2DvduS2m6L69C5xCYs",
  authDomain: "dulcecrepapos.firebaseapp.com",
  projectId: "dulcecrepapos",
  storageBucket: "dulcecrepapos.firebasestorage.app",
  messagingSenderId: "1036136584049",
  appId: "1:1036136584049:web:32d7baea5fa295e7dc9cd0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);