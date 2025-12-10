// Firebase Storage Helper Functions
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadResult,
  UploadTask,
} from 'firebase/storage';
import { storage } from './config';
import { nanoid } from 'nanoid';

export const firebaseStorage = {
  /**
   * Upload file to Firebase Storage
   * @param file File to upload
   * @param path Storage path (e.g., 'students/avatars', 'questions/images')
   * @param customFileName Optional custom filename (default: random nanoid)
   */
  uploadFile: async (
    file: File,
    path: string,
    customFileName?: string
  ): Promise<{ url: string; path: string }> => {
    const fileName = customFileName || `${nanoid()}-${file.name}`;
    const filePath = `${path}/${fileName}`;
    const storageRef = ref(storage, filePath);

    const uploadResult: UploadResult = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(uploadResult.ref);

    return { url, path: filePath };
  },

  /**
   * Upload file with progress tracking
   * @param file File to upload
   * @param path Storage path
   * @param onProgress Progress callback (percentage)
   * @param customFileName Optional custom filename
   */
  uploadFileWithProgress: (
    file: File,
    path: string,
    onProgress?: (progress: number) => void,
    customFileName?: string
  ): UploadTask => {
    const fileName = customFileName || `${nanoid()}-${file.name}`;
    const filePath = `${path}/${fileName}`;
    const storageRef = ref(storage, filePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    if (onProgress) {
      uploadTask.on('state_changed', (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      });
    }

    return uploadTask;
  },

  /**
   * Get download URL for a file
   * @param path Storage path
   */
  getFileUrl: async (path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  },

  /**
   * Delete file from storage
   * @param path Storage path
   */
  deleteFile: async (path: string): Promise<void> => {
    const storageRef = ref(storage, path);
    return await deleteObject(storageRef);
  },

  /**
   * Upload student avatar
   */
  uploadAvatar: async (file: File, userId: string): Promise<{ url: string; path: string }> => {
    return await firebaseStorage.uploadFile(file, 'students/avatars', `${userId}-avatar`);
  },

  /**
   * Upload question image
   */
  uploadQuestionImage: async (file: File): Promise<{ url: string; path: string }> => {
    return await firebaseStorage.uploadFile(file, 'questions/images');
  },

  /**
   * Upload PDF file
   */
  uploadPDF: async (file: File, type: 'materials' | 'explanations'): Promise<{ url: string; path: string }> => {
    return await firebaseStorage.uploadFile(file, `pdf/${type}`);
  },
};
