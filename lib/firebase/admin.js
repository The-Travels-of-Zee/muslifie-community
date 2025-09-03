import admin, { storage } from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
// import serviceAccount from "@/muslifie-49464-firebase-adminsdk-fbsvc-942e13b450.json"asdfsadf

function formatPrivateKey(key) {
  return key.replace(/\\n/g, "\n");
}

export function createFirebaseAdminApp(params) {
  const private_key = formatPrivateKey(params.private_key);

  if (admin.apps.length > 0) {
    return admin.app();
  }

  const cert = admin.credential.cert({
    project_id: params.project_id,
    client_email: params.client_email,
    private_key,
  });

  return admin.initializeApp({
    credential: cert,
    projectId: params.project_id,
    storageBucket: params.storageBucket,
  });
}

export function initAdmin() {
  const params = {
    private_key: process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY,
    project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    client_email: process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  };

  return createFirebaseAdminApp(params);
}

const app = initAdmin();

export const adminDb = getFirestore(app, "muslifie");
export const adminStorage = getStorage(app);

export default app;
