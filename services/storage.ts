// Web implementation — uses fetch() on blob: URIs from expo-document-picker
import { storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

export async function uploadFile(
  storagePath: string,
  localUri: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const storageRef = ref(storage, storagePath);
  const task = uploadBytesResumable(storageRef, blob);

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => {
        if (onProgress && snap.totalBytes > 0) {
          onProgress(snap.bytesTransferred / snap.totalBytes);
        }
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

export async function deleteFile(url: string): Promise<void> {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch {
    // File may already be deleted or URL may be external — ignore
  }
}
