import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDdY5SBrX77Vqs0co7hbDM6BJkk6X3yppE",
  authDomain: "videographycalendar.firebaseapp.com",
  projectId: "videographycalendar",
  storageBucket: "videographycalendar.firebasestorage.app",
  messagingSenderId: "545720853544",
  appId: "1:545720853544:web:fd6ac639744998aac9011d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with Persistence (so users stay logged in)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
export const db = getFirestore(app);