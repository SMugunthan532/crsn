export type ItemCategory = 'Tool' | 'Book' | 'MedicalEquipment' | 'Electronics';

export interface CategoryRule {
  category: ItemCategory;
  displayName: string;
  defaultDurationDays: number;
  dailyFineRate: number; // in $
  iconName: string;
  description: string;
  notes?: string;
  avgCo2SavingsKg: number; // kg CO2 saved per borrow by avoiding new manufacturing
  avgMoneySavedUsd: number; // retail purchase price avoided
}

export const CATEGORY_RULES: Record<ItemCategory, CategoryRule> = {
  Tool: {
    category: 'Tool',
    displayName: 'Tools & Hardware',
    defaultDurationDays: 3,
    dailyFineRate: 5.0,
    iconName: 'Wrench',
    description: 'Drills, ladders, saws, wrenches, pressure washers. High turnover items for neighborhood DIY.',
    notes: '3 days loan period keeps equipment cycling actively through neighbors.',
    avgCo2SavingsKg: 14.5,
    avgMoneySavedUsd: 135
  },
  Book: {
    category: 'Book',
    displayName: 'Books & Learning',
    defaultDurationDays: 14,
    dailyFineRate: 1.0,
    iconName: 'BookOpen',
    description: 'Fiction, textbooks, technical guides, children books. Generous reading window with gentle dues.',
    notes: '14 days generous loan window with modest $1/day late rate.',
    avgCo2SavingsKg: 3.2,
    avgMoneySavedUsd: 28
  },
  MedicalEquipment: {
    category: 'MedicalEquipment',
    displayName: 'Medical & Mobility',
    defaultDurationDays: 7,
    dailyFineRate: 10.0,
    iconName: 'HeartPulse',
    description: 'Wheelchairs, crutches, pulse oximeters, nebulizers, braces. Critical health aids with urgent returns.',
    notes: 'Priority community health resource. High late fee encourages timely return to others in need.',
    avgCo2SavingsKg: 22.0,
    avgMoneySavedUsd: 210
  },
  Electronics: {
    category: 'Electronics',
    displayName: 'Electronics & Media',
    defaultDurationDays: 5,
    dailyFineRate: 8.0,
    iconName: 'Tv',
    description: 'Projectors, DSLR cameras, microphones, monitors, power banks. Precious tech with verified tracking.',
    notes: '5-day loan window; requires safe handling and returning original cables.',
    avgCo2SavingsKg: 35.0,
    avgMoneySavedUsd: 320
  }
};

export interface UserDTO {
  userId: string;
  name: string;
  username: string;
  password?: string;
  email?: string;
  phone?: string;
  locality: string;
  ratingAverage: number;
  ratingCount: number;
  finesOwed: number;
  finesPaid: number;
  joinedDate: string;
  avatarSeed?: string;
  isVerified?: boolean;
  emailVerified?: boolean;
  idVerificationStatus?: 'UNVERIFIED' | 'PENDING' | 'VERIFIED';
  idDocumentType?: 'Driver License' | 'Passport' | 'Utility Bill' | 'Community ID';
  verificationDate?: string;
  extraProofDetails?: string;
  securityPledgeSigned?: boolean;
}

export interface ItemDTO {
  itemId: string;
  title: string;
  category: ItemCategory;
  description: string;
  ownerId: string;
  ownerName: string;
  locality: string;
  isAvailable: boolean;
  borrowDurationDays: number;
  dailyFineRate: number;
  dateAdded: string;
  condition?: 'Like New' | 'Good' | 'Fair';
  pickupInstructions?: string;
  includedAccessories?: string[];
  imageUrl?: string;
}

export type BorrowStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE';

export interface BorrowRecordDTO {
  recordId: string;
  itemId: string;
  itemTitle: string;
  category: ItemCategory;
  borrowerId: string;
  borrowerName: string;
  lenderId: string;
  lenderName: string;
  borrowDate: string; // YYYY-MM-DD
  dueDate: string;    // YYYY-MM-DD
  returnDate: string | null; // YYYY-MM-DD
  status: BorrowStatus;
  daysLate: number;
  fineAmount: number;
  finePaid: boolean;
  pickupNote?: string;
  pickupSlot?: string;
  borrowerMobile?: string;
  extraProofType?: string;
  extraProofNote?: string;
  borrowerRatingGiven?: number; // Borrower rated the lender (1-5)
  lenderRatingGiven?: number;   // Lender rated the borrower (1-5)
  borrowerFeedback?: string;
  lenderFeedback?: string;
}

export interface NotificationDTO {
  id: string;
  recipientUserId: string;
  senderUserId?: string;
  senderName?: string;
  title: string;
  message: string;
  type: 'BORROW_REQUEST' | 'BORROW_CONFIRMED' | 'ITEM_RETURNED' | 'DUE_SOON' | 'OVERDUE' | 'RATING_RECEIVED' | 'CHAT_MESSAGE';
  timestamp: string;
  read: boolean;
  itemId?: string;
  itemTitle?: string;
  recordId?: string;
  pickupNote?: string;
  pickupSlot?: string;
  borrowerMobile?: string;
  extraProofType?: string;
  extraProofNote?: string;
  smsDispatched?: boolean;
}

export interface DirectMessageDTO {
  id: string;
  conversationId: string; // e.g. "record_B101" or "user_U101_U102"
  senderId: string;
  senderName: string;
  recipientId: string;
  text: string;
  timestamp: string;
}

export interface CommunityWishlistRequestDTO {
  id: string;
  requesterId: string;
  requesterName: string;
  locality: string;
  title: string;
  category: ItemCategory;
  neededDate: string;
  note: string;
  status: 'OPEN' | 'OFFERED';
}

export interface AuditLogEntry {
  timestamp: string;
  logId: string;
  actionType: 'REGISTER' | 'LOGIN' | 'ITEM_ADD' | 'ITEM_DELETE' | 'BORROW' | 'RETURN' | 'FINE_PAYMENT' | 'RATE_USER' | 'NOTIFICATION';
  actorId: string;
  actorName: string;
  details: string;
}
