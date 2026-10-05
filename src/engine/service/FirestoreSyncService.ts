import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { ItemDTO, BorrowRecordDTO, UserDTO } from '../../types';
import { ItemRepository } from '../repository/ItemRepository';
import { BorrowRepository } from '../repository/BorrowRepository';
import { UserRepository } from '../repository/UserRepository';
import { CRSNSystem } from '../CRSNSystem';

export class FirestoreSyncService {
  private static instance: FirestoreSyncService;
  private isInitialized = false;
  private unsubscribers: Array<() => void> = [];

  private constructor() {}

  public static getInstance(): FirestoreSyncService {
    if (!FirestoreSyncService.instance) {
      FirestoreSyncService.instance = new FirestoreSyncService();
    }
    return FirestoreSyncService.instance;
  }

  /**
   * Initializes bi-directional synchronization with Firestore:
   * 1. Seed existing initial/local items, users, and borrows to Firestore if not present.
   * 2. Listen to real-time updates from Firestore collections ('items', 'borrowRecords', 'users').
   */
  public async initSync(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // 1. Seed or pull users
      await this.syncUsers();
      // 2. Seed or pull items
      await this.syncItems();
      // 3. Seed or pull borrow records
      await this.syncBorrowRecords();

      // Listen to real-time changes
      this.subscribeToFirestore();
    } catch (err) {
      console.warn('Firestore initial sync encountered an issue, running with local storage fallback:', err);
    }
  }

  private async syncUsers(): Promise<void> {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);

    if (snapshot.empty) {
      // Seed default users to Firestore
      const localUsers = UserRepository.getInstance().findAll();
      for (const u of localUsers) {
        const dto = u.toDTO();
        await setDoc(doc(db, 'users', dto.userId), dto);
      }
    } else {
      const dtos: UserDTO[] = [];
      snapshot.forEach(docSnap => {
        dtos.push(docSnap.data() as UserDTO);
      });
      if (dtos.length > 0) {
        UserRepository.getInstance().loadFromDTOs(dtos);
        CRSNSystem.getInstance().notify();
      }
    }
  }

  private async syncItems(): Promise<void> {
    const itemsCol = collection(db, 'items');
    const snapshot = await getDocs(itemsCol);

    if (snapshot.empty) {
      // Seed default items
      const localItems = ItemRepository.getInstance().findAll();
      for (const item of localItems) {
        const dto = item.toDTO();
        await setDoc(doc(db, 'items', dto.itemId), dto);
      }
    } else {
      const dtos: ItemDTO[] = [];
      snapshot.forEach(docSnap => {
        dtos.push(docSnap.data() as ItemDTO);
      });
      if (dtos.length > 0) {
        ItemRepository.getInstance().loadFromDTOs(dtos);
        CRSNSystem.getInstance().notify();
      }
    }
  }

  private async syncBorrowRecords(): Promise<void> {
    const borrowCol = collection(db, 'borrowRecords');
    const snapshot = await getDocs(borrowCol);

    if (snapshot.empty) {
      // Seed default borrow records
      const localBorrows = BorrowRepository.getInstance().findAll();
      for (const rec of localBorrows) {
        const dto = rec.toDTO();
        await setDoc(doc(db, 'borrowRecords', dto.recordId), dto);
      }
    } else {
      const dtos: BorrowRecordDTO[] = [];
      snapshot.forEach(docSnap => {
        dtos.push(docSnap.data() as BorrowRecordDTO);
      });
      if (dtos.length > 0) {
        BorrowRepository.getInstance().loadFromDTOs(dtos);
        CRSNSystem.getInstance().notify();
      }
    }
  }

  private subscribeToFirestore(): void {
    // Listen for items updates
    const unsubItems = onSnapshot(collection(db, 'items'), (snapshot) => {
      const dtos: ItemDTO[] = [];
      snapshot.forEach(docSnap => {
        dtos.push(docSnap.data() as ItemDTO);
      });
      if (dtos.length > 0) {
        ItemRepository.getInstance().loadFromDTOs(dtos);
        CRSNSystem.getInstance().notify();
      }
    }, (error) => {
      console.warn('Firestore items listener error:', error);
    });
    this.unsubscribers.push(unsubItems);

    // Listen for borrow records updates
    const unsubBorrows = onSnapshot(collection(db, 'borrowRecords'), (snapshot) => {
      const dtos: BorrowRecordDTO[] = [];
      snapshot.forEach(docSnap => {
        dtos.push(docSnap.data() as BorrowRecordDTO);
      });
      if (dtos.length > 0) {
        BorrowRepository.getInstance().loadFromDTOs(dtos);
        CRSNSystem.getInstance().notify();
      }
    }, (error) => {
      console.warn('Firestore borrow records listener error:', error);
    });
    this.unsubscribers.push(unsubBorrows);

    // Listen for users updates
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const dtos: UserDTO[] = [];
      snapshot.forEach(docSnap => {
        dtos.push(docSnap.data() as UserDTO);
      });
      if (dtos.length > 0) {
        UserRepository.getInstance().loadFromDTOs(dtos);
        CRSNSystem.getInstance().notify();
      }
    }, (error) => {
      console.warn('Firestore users listener error:', error);
    });
    this.unsubscribers.push(unsubUsers);
  }

  // Persist single User to Firestore
  public async persistUser(userDTO: UserDTO): Promise<void> {
    try {
      await setDoc(doc(db, 'users', userDTO.userId), userDTO, { merge: true });
    } catch (e) {
      console.warn('Could not sync user to Firestore:', e);
    }
  }

  // Persist single Item to Firestore
  public async persistItem(itemDTO: ItemDTO): Promise<void> {
    try {
      await setDoc(doc(db, 'items', itemDTO.itemId), itemDTO, { merge: true });
    } catch (e) {
      console.warn('Could not sync item to Firestore:', e);
    }
  }

  // Delete Item from Firestore
  public async removeItem(itemId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'items', itemId));
    } catch (e) {
      console.warn('Could not delete item from Firestore:', e);
    }
  }

  // Persist BorrowRecord to Firestore
  public async persistBorrowRecord(recordDTO: BorrowRecordDTO): Promise<void> {
    try {
      await setDoc(doc(db, 'borrowRecords', recordDTO.recordId), recordDTO, { merge: true });
    } catch (e) {
      console.warn('Could not sync borrow record to Firestore:', e);
    }
  }

  public cleanup(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.isInitialized = false;
  }
}
