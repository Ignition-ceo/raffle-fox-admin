import {
  collection,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db } from "./firebase";

export interface CreatePrizeData {
  prizeName: string;
  quantityAvailable: string;
  fullDescription: string;
  keywords: string[];
  tags: string;
  sponsorId: string;
  prizeCategory: string;
  stockDate: string;
  fulfillmentMethod: string;
  deliveryTimeline: string;
  claimWindow: string;
  pickupRequired: boolean;
  eligibleRegions: string;
  retailValueUSD: string;
  breakEvenValue: number;
  ageRestriction: string;
  idRequired: boolean;
  useStandardTerms: boolean;
  termsConditionsUrl: string;
  customTermsType: string;
  customTermsUrl: string;
  additionalInfo: string;
  status: string;
}

/**
 * Upload images to Firebase Storage and create a Firestore document
 * in prize_database, matching the production schema exactly.
 */
export async function createPrizeDocument(
  data: CreatePrizeData,
  imageFiles: File[],
  sponsorId: string
): Promise<string> {
  const storage = getStorage();

  // 1. Upload images
  const imageUrls: string[] = [];
  for (const file of imageFiles) {
    const storageRef = ref(
      storage,
      `prize_database/${Date.now()}_${file.name}`
    );
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    imageUrls.push(url);
  }

  // 2. Build doc matching production schema
  const prizeDoc = {
    prizeName: data.prizeName,
    quantityAvailable: data.quantityAvailable,
    fullDescription: data.fullDescription,
    keywords: data.keywords,
    tags: data.tags,
    thumbnail: imageUrls[0] || "",
    images: imageUrls,
    sponsorId: data.sponsorId,
    prizeCategory: data.prizeCategory,
    stockDate: data.stockDate,
    fulfillmentMethod: data.fulfillmentMethod,
    deliveryTimeline: data.deliveryTimeline,
    claimWindow: data.claimWindow,
    pickupRequired: data.pickupRequired,
    eligibleRegions: data.eligibleRegions,
    retailValueUSD: data.retailValueUSD,
    breakEvenValue: data.breakEvenValue,
    ageRestriction: data.ageRestriction,
    idRequired: data.idRequired,
    useStandardTerms: data.useStandardTerms,
    termsConditionsUrl: data.termsConditionsUrl,
    customTermsType: data.customTermsType,
    customTermsUrl: data.customTermsUrl,
    additionalInfo: data.additionalInfo,
    status: data.status,
    createdAt: Timestamp.now(),
  };

  // 3. Write to Firestore
  const docRef = await addDoc(collection(db, "prize_database"), prizeDoc);

  // 4. Optional: append prizeId to sponsor's prizesCreation
  try {
    await updateDoc(doc(db, "sponsors", sponsorId), {
      prizesCreation: arrayUnion(docRef.id),
    });
  } catch (err) {
    console.warn("Could not update sponsor prizesCreation:", err);
  }

  return docRef.id;
}
