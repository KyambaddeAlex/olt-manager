import {
  browserLocalPersistence,
  getAuth,
  onIdTokenChanged,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { getFirebaseConfig } from './firebaseRtdb';
import { ensureOperatorProfile } from './firebaseRtdb';
import { AuthenticatedOperator, OperatorProfile } from '../types/auth';

export const ADMIN_EMAIL = 'kyambaddealex55@gmail.com';

function getConfiguredAuth() {
  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    throw new Error('Firebase Authentication is not configured. Set the Firebase API key and Project ID before signing in.');
  }

  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: config.apiKey,
      projectId: config.projectId,
      authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
      databaseURL: config.databaseURL,
    });

  return getAuth(app);
}

async function toOperator(user: User): Promise<AuthenticatedOperator> {
  if (!user.emailVerified) {
    throw new Error('Verify your email address using the link Firebase sent you, then sign in again.');
  }
  if (!user.email) throw new Error('This Firebase account does not have an email address.');

  const token = await user.getIdTokenResult();
  return {
    uid: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Field Operator',
    email: user.email,
    role: token.claims.admin === true || user.email.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'operator',
  };
}

export async function signInWithEmailPassword(email: string, password: string): Promise<AuthenticatedOperator> {
  const auth = getConfiguredAuth();
  await setPersistence(auth, browserLocalPersistence);
  const credential = await firebaseSignInWithEmailAndPassword(auth, email, password);
  try {
    const operator = await toOperator(credential.user);
    await ensureOperatorProfile({
      uid: operator.uid,
      email: operator.email!,
      displayName: operator.name,
    });
    return operator;
  } catch (error) {
    if (!credential.user.emailVerified) await signOut(auth);
    throw error;
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Enter your account email first.');
  await sendPasswordResetEmail(getConfiguredAuth(), normalizedEmail);
}

export async function registerWithEmailPassword(
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  const auth = getConfiguredAuth();
  await setPersistence(auth, browserLocalPersistence);
  const normalizedEmail = email.trim().toLowerCase();
  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  try {
    await updateProfile(credential.user, { displayName });
    const profile: OperatorProfile = {
      uid: credential.user.uid,
      email: normalizedEmail,
      displayName,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };
    await ensureOperatorProfile(profile);
    await sendEmailVerification(credential.user);
    await signOut(auth);
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}

export function observeFirebaseAuth(
  onChange: (operator: AuthenticatedOperator | null) => void,
  onError: (error: Error) => void
): () => void {
  try {
    return onIdTokenChanged(
      getConfiguredAuth(),
      (user) => {
        if (!user) {
          onChange(null);
          return;
        }

        void toOperator(user)
          .then(async (operator) => {
            await ensureOperatorProfile({
              uid: operator.uid,
              email: operator.email!,
              displayName: operator.name,
            }, false);
            onChange(operator);
          })
          .catch((error: unknown) => {
            onError(error instanceof Error ? error : new Error('Could not read the Firebase user role.'));
          });
      },
      (error) => onError(error)
    );
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Could not initialize Firebase Authentication.'));
    return () => {};
  }
}

export async function signOutFirebase(): Promise<void> {
  await signOut(getConfiguredAuth());
}
