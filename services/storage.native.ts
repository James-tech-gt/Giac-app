// Native implementation — uses XMLHttpRequest to convert URI to Blob (works with file:// and content:// on Android)
import { storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('Failed to convert URI to Blob'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

export async function uploadFile(
  storagePath: string,
  localUri: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const blob = await uriToBlob(localUri);

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
