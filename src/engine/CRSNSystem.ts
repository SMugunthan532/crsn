/**
 * Central orchestrator connecting User, Item, Borrow, and Notification services and repositories.
 * Maintains simulated date (for fast-forward testing due dates & late fines)
 * and notifies listeners of state changes.
 */
import { BorrowRecordDTO, ItemCategory, ItemDTO, UserDTO } from '../types';
import { BorrowRecord } from './model/BorrowRecord';
import { Item } from './model/Item';
import { User } from './model/User';
import { BorrowRepository } from './repository/BorrowRepository';
import { ItemRepository } from './repository/ItemRepository';
import { UserRepository } from './repository/UserRepository';
import { INITIAL_BORROW_RECORDS, INITIAL_ITEMS, INITIAL_USERS } from './sampleData';
import { BorrowService } from './service/BorrowService';
import { ItemService } from './service/ItemService';
import { UserService } from './service/UserService';
import { NotificationService } from './service/NotificationService';
import { FileManager } from './util/FileManager';
import { FirestoreSyncService } from './service/FirestoreSyncService';

export class CRSNSystem {
  private static instance: CRSNSystem;

  public userService: UserService;
  public itemService: ItemService;
  public borrowService: BorrowService;
  public notificationService: NotificationService;

  // Active simulated system date (defaults to current date e.g. 2026-09-21)
  private currentDate: string;

  // Currently logged in user (null if guest)
  private currentUser: User | null = null;

  // Listeners for UI state updates
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.userService = new UserService();
    this.itemService = new ItemService();
    this.borrowService = new BorrowService();
    this.notificationService = NotificationService.getInstance();
    this.currentDate = '2026-09-21';

    this.initializeData();
  }

  public static getInstance(): CRSNSystem {
    if (!CRSNSystem.instance) {
      CRSNSystem.instance = new CRSNSystem();
    }
    return CRSNSystem.instance;
  }

  private initializeData(): void {
    FileManager.initialize();
    const userRepo = UserRepository.getInstance();
    const itemRepo = ItemRepository.getInstance();
    const borrowRepo = BorrowRepository.getInstance();

    const usersLoaded = userRepo.loadFromStorage();
    if (!usersLoaded) {
      userRepo.loadFromDTOs(INITIAL_USERS);
      userRepo.persist();
    }

    const itemsLoaded = itemRepo.loadFromStorage();
    if (!itemsLoaded) {
      itemRepo.loadFromDTOs(INITIAL_ITEMS);
      itemRepo.persist();
    }

    const borrowsLoaded = borrowRepo.loadFromStorage();
    if (!borrowsLoaded) {
      borrowRepo.loadFromDTOs(INITIAL_BORROW_RECORDS);
      borrowRepo.persist();
    }

    // Check if an authenticated user session was persisted in localStorage
    const savedUserId = localStorage.getItem('crsn_active_user_id');
    if (savedUserId) {
      const savedUser = userRepo.findById(savedUserId);
      if (savedUser) {
        this.currentUser = savedUser;
      }
    }

    // Default to logged-in user Sarah Jenkins (U101) or first available if no saved session
    if (!this.currentUser) {
      const initialUser = userRepo.findById('U101') || userRepo.findAll()[0];
      if (initialUser) {
        this.currentUser = initialUser;
        localStorage.setItem('crsn_active_user_id', initialUser.getUserId());
      }
    }

    this.borrowService.refreshOverdueStatus(this.currentDate);

    // Asynchronously connect & synchronize with Firebase Firestore
    FirestoreSyncService.getInstance().initSync().catch(err => {
      console.warn('Initial Firestore synchronization note:', err);
    });
  }

  public resetToDefaults(): void {
    localStorage.removeItem('crsn_users_data');
    localStorage.removeItem('crsn_items_data');
    localStorage.removeItem('crsn_borrow_records');
    localStorage.removeItem('crsn_active_user_id');
    FileManager.clearLogs();
    this.notificationService.clearAll();

    UserRepository.getInstance().loadFromDTOs(INITIAL_USERS);
    ItemRepository.getInstance().loadFromDTOs(INITIAL_ITEMS);
    BorrowRepository.getInstance().loadFromDTOs(INITIAL_BORROW_RECORDS);

    UserRepository.getInstance().persist();
    ItemRepository.getInstance().persist();
    BorrowRepository.getInstance().persist();

    this.currentDate = '2026-09-21';
    this.currentUser = UserRepository.getInstance().findById('U101') || null;
    if (this.currentUser) {
      localStorage.setItem('crsn_active_user_id', this.currentUser.getUserId());
    }

    FileManager.logTransaction('SYSTEM' as any, 'SYS', 'CRSN System', 'Reset system to reference default demo records');
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify(): void {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error('Error in CRSNSystem listener', e);
      }
    });
  }

  // Simulated System Clock (Time Travel for testing due dates & late fees)
  public getCurrentDate(): string {
    return this.currentDate;
  }

  public setSimulatedDate(newDate: string): void {
    this.currentDate = newDate;
    this.borrowService.refreshOverdueStatus(this.currentDate);
    this.notify();
  }

  public advanceDays(days: number): void {
    this.currentDate = BorrowService.addDaysToDate(this.currentDate, days);
    this.borrowService.refreshOverdueStatus(this.currentDate);
    this.notify();
  }

  // User session: persist active session so user is never prompted to login again
  public getCurrentUser(): User | null {
    if (this.currentUser) {
      return UserRepository.getInstance().findById(this.currentUser.getUserId()) || null;
    }
    return null;
  }

  public setCurrentUser(user: User | null): void {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('crsn_active_user_id', user.getUserId());
    } else {
      localStorage.removeItem('crsn_active_user_id');
    }
    this.notify();
  }

  public loginUser(username: string, password: string): User {
    const user = this.userService.login(username, password);
    this.currentUser = user;
    localStorage.setItem('crsn_active_user_id', user.getUserId());
    this.notify();
    return user;
  }

  public registerUser(name: string, username: string, password: string, locality: string, email?: string, phone?: string): User {
    const user = this.userService.register(name, username, password, locality);
    if (email) {
      user.setEmail(email);
    }
    if (phone) {
      user.setPhone(phone);
    }
    this.currentUser = user;
    localStorage.setItem('crsn_active_user_id', user.getUserId());
    FirestoreSyncService.getInstance().persistUser(user.toDTO());
    this.notify();
    return user;
  }

  public registerOrSyncFirebaseUser(firebaseUser: { uid: string; displayName?: string | null; email?: string | null; emailVerified?: boolean; phoneNumber?: string | null }): User {
    const userRepo = UserRepository.getInstance();
    let existingUser = userRepo.findById(firebaseUser.uid);
    if (!existingUser && firebaseUser.email) {
      existingUser = userRepo.findAll().find(u => u.getEmail().toLowerCase() === firebaseUser.email?.toLowerCase());
    }

    if (existingUser) {
      if (firebaseUser.emailVerified && !existingUser.getEmailVerified()) {
        existingUser.setEmailVerified(true);
      }
      if (firebaseUser.phoneNumber && !existingUser.getPhone()) {
        existingUser.setPhone(firebaseUser.phoneNumber);
      }
      FirestoreSyncService.getInstance().persistUser(existingUser.toDTO());
      this.currentUser = existingUser;
      localStorage.setItem('crsn_active_user_id', existingUser.getUserId());
      this.notify();
      return existingUser;
    }

    // Create new profile for Firebase authenticated user
    const defaultName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Community Neighbor';
    const defaultUsername = (firebaseUser.email?.split('@')[0] || `user_${firebaseUser.uid.slice(0, 6)}`).toLowerCase().replace(/[^a-z0-9_]/g, '');
    const newUser = new User(
      defaultName,
      defaultUsername,
      'firebase_oauth',
      'Maple Heights',
      firebaseUser.uid,
      5.0,
      1,
      0.0,
      0.0,
      new Date().toISOString().split('T')[0],
      firebaseUser.email || '',
      false,
      Boolean(firebaseUser.emailVerified),
      'UNVERIFIED',
      undefined,
      undefined,
      firebaseUser.phoneNumber || undefined
    );

    userRepo.save(newUser);
    this.currentUser = newUser;
    localStorage.setItem('crsn_active_user_id', newUser.getUserId());
    FirestoreSyncService.getInstance().persistUser(newUser.toDTO());
    this.notify();
    return newUser;
  }

  public verifyUserId(
    userId: string, 
    documentType: 'Driver License' | 'Passport' | 'Utility Bill' | 'Community ID', 
    simulatedNote?: string,
    phone?: string,
    extraProofDetails?: string
  ): void {
    const user = UserRepository.getInstance().findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.setIdVerificationStatus('VERIFIED', documentType);
    if (phone) user.setPhone(phone);
    if (extraProofDetails) user.setExtraProofDetails(extraProofDetails);
    user.setSecurityPledgeSigned(true);

    UserRepository.getInstance().save(user);
    FirestoreSyncService.getInstance().persistUser(user.toDTO());

    this.notificationService.sendNotification(
      userId,
      'ID & Security Verification Approved',
      `Your ${documentType} and extra security proofs have been confirmed in the Community Trust Registry. You now have the Verified Resident ID trust badge and can borrow high-security resources.`,
      'BORROW_CONFIRMED',
      {
        senderUserId: 'SYS_ADMIN',
        senderName: 'Trust & Safety Registry'
      }
    );

    this.notify();
  }

  public logout(): void {
    this.currentUser = null;
    localStorage.removeItem('crsn_active_user_id');
    this.notify();
  }

  // Item operations
  public listItem(
    title: string,
    category: ItemCategory,
    description: string,
    extraDetail?: string,
    condition: 'Like New' | 'Good' | 'Fair' = 'Good',
    pickupInstructions?: string
  ): Item {
    if (!this.currentUser) {
      throw new Error('You must be logged in to list an item.');
    }
    const item = this.itemService.addItem(
      title,
      category,
      description,
      this.currentUser.getUserId(),
      this.currentUser.getName(),
      this.currentUser.getLocality(),
      extraDetail,
      condition
    );
    FirestoreSyncService.getInstance().persistItem(item.toDTO());
    this.notify();
    return item;
  }

  public deleteItem(itemId: string): boolean {
    if (!this.currentUser) {
      throw new Error('You must be logged in to delete an item.');
    }
    const res = this.itemService.deleteItem(itemId, this.currentUser.getUserId());
    if (res) {
      FirestoreSyncService.getInstance().removeItem(itemId);
    }
    this.notify();
    return res;
  }

  // Borrow & Return operations with real-time notifications to owner (in-app + mobile SMS dispatch simulation)
  public borrowItem(
    itemId: string,
    pickupNote?: string,
    pickupSlot?: string,
    borrowerMobile?: string,
    extraProofType?: string,
    extraProofNote?: string
  ): BorrowRecord {
    if (!this.currentUser) {
      throw new Error('You must be logged in to borrow an item.');
    }

    const item = this.itemService.getItemById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const borrower = this.currentUser;

    // Update phone on borrower user if provided
    if (borrowerMobile) {
      borrower.setPhone(borrowerMobile);
      UserRepository.getInstance().save(borrower);
      FirestoreSyncService.getInstance().persistUser(borrower.toDTO());
    }

    const record = this.borrowService.borrowItem(
      itemId,
      borrower.getUserId(),
      this.currentDate,
      pickupNote,
      pickupSlot,
      borrowerMobile,
      extraProofType,
      extraProofNote
    );

    // Fetch lender to check if owner mobile is on file
    const lender = UserRepository.getInstance().findById(item.getOwnerId());
    const ownerMobileText = lender?.getPhone() ? ` (Sent to owner SMS: ${lender.getPhone()})` : '';
    const borrowerContactText = borrowerMobile ? ` [Borrower Contact: ${borrowerMobile}]` : '';
    const proofText = extraProofType ? ` [Security Proof: ${extraProofType} - ${extraProofNote || 'Verified'}]` : '';

    // 1. Instant Notification to Lender (Item Owner)
    this.notificationService.sendNotification(
      item.getOwnerId(),
      `Borrow Request: ${item.getTitle()}`,
      `${borrower.getName()} requested to borrow your item. Pickup: "${pickupSlot || 'As agreed'}".${borrowerContactText}${proofText}. Note: "${pickupNote || 'No special note'}".${ownerMobileText}`,
      'BORROW_REQUEST',
      {
        senderUserId: borrower.getUserId(),
        senderName: borrower.getName(),
        itemId: item.getItemId(),
        itemTitle: item.getTitle(),
        recordId: record.getRecordId(),
        pickupNote,
        pickupSlot,
        borrowerMobile,
        extraProofType,
        extraProofNote,
        smsDispatched: true
      }
    );

    // 2. Confirmation Notification to Borrower
    this.notificationService.sendNotification(
      borrower.getUserId(),
      `Borrow Confirmed: ${item.getTitle()}`,
      `You have borrowed this item from ${item.getOwnerName()}. It is due back by ${record.getDueDate()}.${borrowerMobile ? ` SMS updates enabled on ${borrowerMobile}.` : ''}`,
      'BORROW_CONFIRMED',
      {
        senderUserId: item.getOwnerId(),
        senderName: item.getOwnerName(),
        itemId: item.getItemId(),
        itemTitle: item.getTitle(),
        recordId: record.getRecordId(),
        borrowerMobile,
        smsDispatched: true
      }
    );

    FirestoreSyncService.getInstance().persistBorrowRecord(record.toDTO());
    FirestoreSyncService.getInstance().persistItem(item.toDTO());

    this.notify();
    return record;
  }

  public returnItem(recordId: string, customReturnDate?: string): { record: BorrowRecord; daysLate: number; fineCalculated: number } {
    const returnDate = customReturnDate || this.currentDate;
    const result = this.borrowService.returnItem(recordId, returnDate);

    // Notify Lender that their item has returned
    if (this.currentUser) {
      this.notificationService.sendNotification(
        result.record.getLenderId(),
        `Item Returned: ${result.record.getItemTitle()}`,
        `${result.record.getBorrowerName()} has returned your item on ${returnDate}. Please inspect and rate your peer!`,
        'ITEM_RETURNED',
        {
          senderUserId: result.record.getBorrowerId(),
          senderName: result.record.getBorrowerName(),
          itemId: result.record.getItemId(),
          itemTitle: result.record.getItemTitle(),
          recordId: result.record.getRecordId(),
          smsDispatched: true
        }
      );
    }

    FirestoreSyncService.getInstance().persistBorrowRecord(result.record.toDTO());
    const item = this.itemService.getItemById(result.record.getItemId());
    if (item) {
      FirestoreSyncService.getInstance().persistItem(item.toDTO());
    }

    this.notify();
    return result;
  }

  public rateTransaction(recordId: string, score: number, feedback?: string): void {
    if (!this.currentUser) {
      throw new Error('You must be logged in to rate a transaction.');
    }
    this.borrowService.rateTransaction(recordId, this.currentUser.getUserId(), score, feedback);

    const record = this.borrowService.getRecordById(recordId);
    if (record) {
      const recipientId = record.getBorrowerId() === this.currentUser.getUserId()
        ? record.getLenderId()
        : record.getBorrowerId();

      this.notificationService.sendNotification(
        recipientId,
        `New Trust Rating: ${score}★`,
        `${this.currentUser.getName()} gave you ${score}★: "${feedback || 'Responsible community member'}"`,
        'RATING_RECEIVED',
        {
          senderUserId: this.currentUser.getUserId(),
          senderName: this.currentUser.getName(),
          recordId,
          smsDispatched: true
        }
      );

      FirestoreSyncService.getInstance().persistBorrowRecord(record.toDTO());
      const recipientUser = UserRepository.getInstance().findById(recipientId);
      if (recipientUser) {
        FirestoreSyncService.getInstance().persistUser(recipientUser.toDTO());
      }
    }

    this.notify();
  }

  public payFine(amount: number): number {
    if (!this.currentUser) {
      throw new Error('You must be logged in to pay fines.');
    }
    const paid = this.userService.payUserFine(this.currentUser.getUserId(), amount);
    const updatedUser = UserRepository.getInstance().findById(this.currentUser.getUserId());
    if (updatedUser) {
      FirestoreSyncService.getInstance().persistUser(updatedUser.toDTO());
    }
    this.notify();
    return paid;
  }
}
