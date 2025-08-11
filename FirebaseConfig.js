// FirebaseConfig.js
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyDPfwkvJVMaqYiIQ99LBwvO-0qm_4BZytw",
  authDomain: "indulge-b42a9.firebaseapp.com",
  projectId: "indulge-b42a9",
  storageBucket: "indulge-b42a9.appspot.com",
  messagingSenderId: "496651025555",
  appId: "1:496651025555:web:26c1223ba83fb88398a166"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);

export { app, auth, db };
