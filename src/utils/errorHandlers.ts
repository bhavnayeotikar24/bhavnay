import { OperationType, FirestoreErrorInfo, AdminProfile } from '../types';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  let currentUser: AdminProfile | null = null;
  try {
    const savedUser = localStorage.getItem('user');
    if (savedUser) currentUser = JSON.parse(savedUser);
  } catch (e) {}

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.email,
      email: currentUser?.email
    },
    operationType,
    path
  };
  
  const jsonError = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonError);
  throw new Error(jsonError);
}
