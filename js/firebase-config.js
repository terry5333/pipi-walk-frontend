// Firebase Configuration for 皮皮漫步
const firebaseConfig = {
    apiKey: "AIzaSyB74wWAOnKMy_ZFRWJVosvR4pihbAuHSTM",
    authDomain: "pikwalk.firebaseapp.com",
    databaseURL: "https://pikwalk-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "pikwalk",
    storageBucket: "pikwalk.firebasestorage.app",
    messagingSenderId: "850683569216",
    appId: "1:850683569216:web:3c0f95fa3d53c6ce77eba5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
