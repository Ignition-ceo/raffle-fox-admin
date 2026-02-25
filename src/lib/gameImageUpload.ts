import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * Upload a game image to Firebase Storage.
 *
 * @param raffleId - The Firestore doc ID of the raffle
 * @param file     - The image File to upload
 * @param type     - "game" for the primary image, "reveal" for the post-raffle reveal image
 * @returns        - The public download URL
 */
export async function uploadGameImage(
  raffleId: string,
  file: File,
  type: "game" | "reveal"
): Promise<string> {
  const path = `raffles/${raffleId}/${type}-${Date.now()}`;
  const fileRef = ref(storage, path);

  await uploadBytes(fileRef, file, {
    contentType: file.type,
    cacheControl: "public,max-age=31536000",
  });

  return await getDownloadURL(fileRef);
}
