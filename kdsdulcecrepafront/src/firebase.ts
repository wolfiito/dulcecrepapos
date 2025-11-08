import { initializeApp } from "firebase/app";
import { 
    getFirestore,
    collection, 
    doc, 
    getDocs,
    updateDoc, // <-- Necesaria para el KDS
    onSnapshot, // <-- Necesaria para el KDS
    query, // <-- Necesaria para el KDS
    where, // <-- Necesaria para el KDS
    orderBy, // <-- Necesaria para el KDS
    // Importamos los TIPOS que necesitamos
    type DocumentData,
    type QuerySnapshot, // <-- Necesaria para el KDS
    type QueryDocumentSnapshot,
    type Timestamp // <-- Necesaria para el KDS
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA_H_rGtLHa_WKzn2DvduS2m6L69C5xCYs",
  authDomain: "dulcecrepapos.firebaseapp.com",
  projectId: "dulcecrepapos",
  storageBucket: "dulcecrepapos.firebasestorage.app",
  messagingSenderId: "1036136584049",
  appId: "1:1036136584049:web:32d7baea5fa295e7dc9cd0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Exporta las funciones que usaremos
export { 
    collection, 
    doc, 
    getDocs, 
    updateDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy 
};

// Exporta los TIPOS que usaremos
export type { 
    DocumentData, 
    QuerySnapshot,
    QueryDocumentSnapshot, 
    Timestamp 
};