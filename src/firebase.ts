import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  getDocFromServer,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase services using credentials
const app = initializeApp(firebaseConfig);

// Initialize Firestore on active database partition
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
export const auth = getAuth(app);

// Strict operation type enums required by Firebase Integration Skill handbook
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Handle and parse incoming Firestore access rejection errors rigorously (Skill-mandated requirement)
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Payload: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check verification upon early initialization
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Try to retrieve connection details from active channel or system document
    await getDocFromServer(doc(db, 'system', 'connection'));
    console.log("Firestore cloud system established successfully.");
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore system is offline. Check your configurations.");
    } else {
      console.log("Firestore connection test completed (ignoring pre-existing permission triggers for 'system' collection).");
    }
    return false;
  }
}

/**
 * Sync active User status back up to the active cloud database
 */
export async function syncUserToFirestore(userData: any) {
  if (!userData) return;
  const path = `users/${userData.id}`;
  try {
    await setDoc(doc(db, 'users', userData.id), {
      id: userData.id,
      username: userData.username || "",
      nickname: userData.nickname || userData.username || "",
      avatar: userData.avatar || "",
      banner: userData.banner || "#5b65f2",
      status: userData.status || "online",
      customStatusText: userData.customStatusText || "",
      tag: userData.tag || "0000",
      createdAt: userData.createdAt || new Date().toISOString()
    });
    console.log(`Firestore synchronized user profile [${userData.id}]`);
  } catch (err) {
    console.warn("Firestore user sync warning:", err);
  }
}

/**
 * Sync active channel chat message logs to Firestore cloud database
 */
export async function syncMessageToFirestore(channelId: string, msg: any) {
  if (!channelId || !msg) return;
  const path = `channels/${channelId}/messages/${msg.id}`;
  try {
    await setDoc(doc(db, 'channels', channelId, 'messages', msg.id), {
      id: msg.id,
      channelId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      content: msg.content,
      createdAt: msg.createdAt || new Date().toISOString()
    });
    console.log(`Firestore synchronized chat message [${msg.id}]`);
  } catch (err) {
    console.warn("Firestore chat message sync warning:", err);
  }
}

// Call connection check once on bundle load
testFirestoreConnection();
