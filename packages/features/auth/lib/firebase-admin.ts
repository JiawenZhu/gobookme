import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID ?? "gobookme-app",
  });
}

export default admin;
export const firebaseAdminAuth = admin.auth();
