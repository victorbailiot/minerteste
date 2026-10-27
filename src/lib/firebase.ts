import { initializeApp } from 'firebase/app'
import { getStorage } from 'firebase/storage'

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

// Inicializar Storage
export const storage = getStorage(app)

// Função para fazer upload de arquivo
export async function uploadFile(file: File, path: string): Promise<string> {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage')
  
  const storageRef = ref(storage, path)
  const snapshot = await uploadBytes(storageRef, file)
  const downloadURL = await getDownloadURL(snapshot.ref)
  
  return downloadURL
}

// Função para deletar arquivo
export async function deleteFile(path: string): Promise<void> {
  const { ref, deleteObject } = await import('firebase/storage')
  
  const storageRef = ref(storage, path)
  await deleteObject(storageRef)
}

// Função para gerar nome único do arquivo
export function generateUniqueFileName(originalName: string, userId: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = originalName.split('.').pop()
  return `comprovantes/${userId}/${timestamp}_${randomString}.${extension}`
} 