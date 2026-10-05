/**
 * service/BorrowService.java equivalent
 * Handles the complete lifecycle:
 * Availability verification, double-borrow prevention, due date calculation,
 * return handling, automatic fine calculation, trust score rating updates, and audit logging.
 */
import { BorrowRecordDTO } from '../../types';
import { BorrowRecord } from '../model/BorrowRecord';
import { BorrowRepository } from '../repository/BorrowRepository';
import { ItemRepository } from '../repository/ItemRepository';
import { UserRepository } from '../repository/UserRepository';
import { FileManager } from '../util/FileManager';

export class BorrowService {
  private borrowRepo: BorrowRepository = BorrowRepository.getInstance();
  private itemRepo: ItemRepository = ItemRepository.getInstance();
  private userRepo: UserRepository = UserRepository.getInstance();

  /**
   * Helper to add days to a 'YYYY-MM-DD' date string
   */
  public static addDaysToDate(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
  }

  /**
   * Helper to calculate difference in days between two 'YYYY-MM-DD' dates (d2 - d1)
   */
  public static calculateDaysDifference(d1: string, d2: string): number {
    const date1 = new Date(d1 + 'T00:00:00Z');
    const date2 = new Date(d2 + 'T00:00:00Z');
    const diffMs = date2.getTime() - date1.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  public borrowItem(
    itemId: string,
    borrowerId: string,
    borrowDateStr: string = new Date().toISOString().split('T')[0],
    pickupNote?: string,
    pickupSlot?: string,
    borrowerMobile?: string,
    extraProofType?: string,
    extraProofNote?: string
  ): BorrowRecord {
    const item = this.itemRepo.findById(itemId);
    if (!item) {
      throw new Error(`Item with ID '${itemId}' does not exist.`);
    }

    const borrower = this.userRepo.findById(borrowerId);
    if (!borrower) {
      throw new Error(`Borrower user with ID '${borrowerId}' does not exist.`);
    }

    // Rule: Cannot borrow your own item
    if (item.getOwnerId() === borrowerId) {
      throw new Error(`You are the owner of '${item.getTitle()}'. You cannot borrow your own item.`);
    }

    // Rule: Availability check & prevent double-borrowing
    if (!item.getIsAvailable()) {
      throw new Error(`Item '${item.getTitle()}' is currently not available. It has already been borrowed.`);
    }

    // Rule: Account restriction for users with excessive unpaid fines (Extendable accountability rule)
    if (borrower.getFinesOwed() >= 30.0) {
      throw new Error(
        `Borrowing Blocked: You have $${borrower.getFinesOwed().toFixed(2)} in unpaid late fines. ` +
        `Please clear your pending fines before borrowing additional resources.`
      );
    }

    // Automatically calculate due date based on category borrow duration (Polymorphism)
    const durationDays = item.getBorrowDuration();
    const dueDateStr = BorrowService.addDaysToDate(borrowDateStr, durationDays);

    // Save phone number to user profile if provided and not yet stored
    if (borrowerMobile && !borrower.getPhone()) {
      borrower.setPhone(borrowerMobile);
      this.userRepo.save(borrower);
    }

    // Lock item availability
    item.setAvailable(false);
    this.itemRepo.save(item);

    // Create and save borrow record
    const record = new BorrowRecord(
      item.getItemId(),
      item.getTitle(),
      item.getCategory(),
      borrower.getUserId(),
      borrower.getName(),
      item.getOwnerId(),
      item.getOwnerName(),
      borrowDateStr,
      dueDateStr,
      undefined,
      null,
      'ACTIVE',
      0,
      0,
      false,
      pickupNote,
      pickupSlot,
      borrowerMobile,
      extraProofType,
      extraProofNote
    );
    this.borrowRepo.save(record);

    // Write audit entry to transactions.log
    FileManager.logTransaction(
      'BORROW',
      borrower.getUserId(),
      borrower.getName(),
      `Borrowed '${item.getTitle()}' [${item.getItemId()}] from ${item.getOwnerName()} (${item.getCategory()}). Due: ${dueDateStr}. Proof: ${extraProofType || 'None'}. Phone: ${borrowerMobile || 'N/A'}`
    );

    return record;
  }

  public returnItem(
    recordId: string,
    returnDateStr: string = new Date().toISOString().split('T')[0]
  ): { record: BorrowRecord; daysLate: number; fineCalculated: number } {
    const record = this.borrowRepo.findById(recordId);
    if (!record) {
      throw new Error(`Borrow record '${recordId}' not found.`);
    }

    if (record.getStatus() === 'RETURNED') {
      throw new Error(`Item '${record.getItemTitle()}' has already been marked as returned on ${record.getReturnDate()}.`);
    }

    const item = this.itemRepo.findById(record.getItemId());
    if (!item) {
      throw new Error(`Associated item '${record.getItemId()}' was not found in inventory.`);
    }

    const borrower = this.userRepo.findById(record.getBorrowerId());

    // Calculate days late: returnDate - dueDate
    const daysLateRaw = BorrowService.calculateDaysDifference(record.getDueDate(), returnDateStr);
    const daysLate = Math.max(0, daysLateRaw);

    // Automatic fine calculation: daysLate * dailyFineRate (Polymorphic)
    const fineCalculated = item.calculateFine(daysLate);

    // Update record
    record.setReturned(returnDateStr, daysLate, fineCalculated);
    this.borrowRepo.save(record);

    // Unlock item availability
    item.setAvailable(true);
    this.itemRepo.save(item);

    // Assess fine on borrower account if returned overdue
    if (fineCalculated > 0 && borrower) {
      borrower.addFine(fineCalculated);
      this.userRepo.save(borrower);
      FileManager.logTransaction(
        'FINE_PAYMENT',
        borrower.getUserId(),
        borrower.getName(),
        `Assessed $${fineCalculated.toFixed(2)} late fine for '${item.getTitle()}' (${daysLate} days overdue).`
      );
    }

    FileManager.logTransaction(
      'RETURN',
      record.getBorrowerId(),
      record.getBorrowerName(),
      `Returned '${item.getTitle()}' [${item.getItemId()}] to ${item.getOwnerName()} on ${returnDateStr}. Status: ${daysLate > 0 ? `Late by ${daysLate} days (Fine: $${fineCalculated.toFixed(2)})` : 'On Time ($0.00 fines)'}.`
    );

    return {
      record,
      daysLate,
      fineCalculated
    };
  }

  public rateTransaction(
    recordId: string,
    actorUserId: string,
    ratingScore: number,
    feedbackComment?: string
  ): void {
    const record = this.borrowRepo.findById(recordId);
    if (!record) {
      throw new Error(`Borrow record '${recordId}' does not exist.`);
    }

    if (record.getStatus() !== 'RETURNED') {
      throw new Error('You can only rate a transaction after the item has been returned.');
    }

    const isBorrower = actorUserId === record.getBorrowerId();
    const isLender = actorUserId === record.getLenderId();

    if (!isBorrower && !isLender) {
      throw new Error('You were not a party to this borrowing transaction.');
    }

    if (isBorrower) {
      record.rateByBorrower(ratingScore, feedbackComment);
      const lender = this.userRepo.findById(record.getLenderId());
      if (lender) {
        lender.addRating(ratingScore);
        this.userRepo.save(lender);
      }
    } else {
      record.rateByLender(ratingScore, feedbackComment);
      const borrower = this.userRepo.findById(record.getBorrowerId());
      if (borrower) {
        borrower.addRating(ratingScore);
        this.userRepo.save(borrower);
      }
    }

    this.borrowRepo.save(record);

    FileManager.logTransaction(
      'RATE_USER',
      actorUserId,
      isBorrower ? record.getBorrowerName() : record.getLenderName(),
      `Submitted ${ratingScore}★ rating for transaction ${recordId}. Comment: "${feedbackComment || 'None'}"`
    );
  }

  public getActiveBorrows(borrowerId: string): BorrowRecord[] {
    return this.borrowRepo.findByBorrower(borrowerId).filter(r => r.getStatus() !== 'RETURNED');
  }

  public getBorrowerHistory(borrowerId: string): BorrowRecord[] {
    return this.borrowRepo.findByBorrower(borrowerId);
  }

  public getLenderHistory(lenderId: string): BorrowRecord[] {
    return this.borrowRepo.findByLender(lenderId);
  }

  public getAllRecords(): BorrowRecord[] {
    return this.borrowRepo.findAll();
  }

  public getRecordById(recordId: string): BorrowRecord | null {
    return this.borrowRepo.findById(recordId) || null;
  }

  public refreshOverdueStatus(currentDateStr: string): void {
    const all = this.borrowRepo.findAll();
    all.forEach(record => {
      if (record.getStatus() === 'ACTIVE') {
        const diff = BorrowService.calculateDaysDifference(record.getDueDate(), currentDateStr);
        if (diff > 0) {
          record.markOverdue();
          record.setDaysLate(diff);
          const item = this.itemRepo.findById(record.getItemId());
          if (item) {
            record.setFineAmount(item.calculateFine(diff));
          }
        }
      }
    });
    this.borrowRepo.persist();
  }
}
