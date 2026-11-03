// PIO Overwatch settings. Fill in ONE of the two options below, then commit.
// Leave both empty to run the preview with sample data.

// Option A (current): Firebase. Paste the firebaseConfig from
// Firebase console > Project settings > Your apps > Web app > SDK setup and configuration > Config.
window.PIO_FIREBASE = {// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB12evmax9XlC7VtZ-XCsytwDASRsBj_GM",
  authDomain: "project-overwatch-pio.firebaseapp.com",
  projectId: "project-overwatch-pio",
  storageBucket: "project-overwatch-pio.firebasestorage.app",
  messagingSenderId: "471563326848",
  appId: "1:471563326848:web:b8a6fa7b1733030441dd65"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Option B (old): Google Apps Script web app URL. Used only when the Firebase settings above are empty.
window.PIO_API_URL = '';
