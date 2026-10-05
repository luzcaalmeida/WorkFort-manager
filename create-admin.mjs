import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({
  projectId: "gestao-empresa-obra",
});

const auth = getAuth(app);
const db = getFirestore(app, "ai-studio-gestor360-efb1b887-14e4-43d0-aae6-da51e2c64571");

async function configureAdmin() {
  const email = "lzc1.email@gmail.com";
  let uid;
  try {
    const userRecord = await auth.getUserByEmail(email);
    uid = userRecord.uid;
    console.log("Found user with UID:", uid);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      try {
        const newUser = await auth.createUser({
          email: email,
          password: "Lzc123@@",
          displayName: "Administrador Sistema"
        });
        uid = newUser.uid;
        console.log("Created user with UID:", uid);
      } catch (createErr) {
        console.error("Error creating user:", createErr);
        process.exit(1);
      }
    } else {
      console.error("Error fetching user:", error);
      process.exit(1);
    }
  }

  try {
    // Set Firestore document
    await db.collection('users').doc(uid).set({
      name: "Administrador",
      email: email,
      role: "admin",
      phone: "",
      taxAddress: "",
      documents: []
    });
    console.log("Admin profile configured in Firestore.");
    process.exit(0);
  } catch (err) {
    console.error("Error setting Firestore document:", err);
    process.exit(1);
  }
}

configureAdmin();
