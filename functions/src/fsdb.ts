import * as admin from "firebase-admin";
admin.initializeApp();
const fsdb = admin.firestore();

export default fsdb;
