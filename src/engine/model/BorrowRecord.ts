/**
 * BorrowRecord tracks the lifecycle of an exchange: item, borrower, lender, borrowDate, dueDate, returnDate, finePaid, status, pickup instructions, phone numbers, extra security proof & ratings.
 */
import { BorrowRecordDTO, BorrowStatus, ItemCategory } from '../../types';

export class BorrowRecord {
  private static idCounter: number = 300;

  private recordId: string;
  private itemId: string;
  private itemTitle: string;
  private category: ItemCategory;
  private borrowerId: string;
  private borrowerName: string;
  private lenderId: string;
  private lenderName: string;
  private borrowDate: string; // YYYY-MM-DD
  private dueDate: string;    // YYYY-MM-DD
  private returnDate: string | null;
  private status: BorrowStatus;
  private daysLate: number;
  private fineAmount: number;
  private finePaid: boolean;
  private pickupNote?: string;
  private pickupSlot?: string;
  private borrowerMobile?: string;
  private extraProofType?: string;
  private extraProofNote?: string;
  private borrowerRatingGiven?: number;
  private lenderRatingGiven?: number;
  private borrowerFeedback?: string;
  private lenderFeedback?: string;

  constructor(
    itemId: string,
    itemTitle: string,
    category: ItemCategory,
    borrowerId: string,
    borrowerName: string,
    lenderId: string,
    lenderName: string,
    borrowDate: string,
    dueDate: string,
    recordId?: string,
    returnDate: string | null = null,
    status: BorrowStatus = 'ACTIVE',
    daysLate: number = 0,
    fineAmount: number = 0,
    finePaid: boolean = false,
    pickupNote?: string,
    pickupSlot?: string,
    borrowerMobile?: string,
    extraProofType?: string,
    extraProofNote?: string,
    borrowerRatingGiven?: number,
    lenderRatingGiven?: number,
    borrowerFeedback?: string,
    lenderFeedback?: string
  ) {
    if (recordId) {
      this.recordId = recordId;
      const numPart = parseInt(recordId.replace(/\D/g, ''), 10);
      if (!isNaN(numPart) && numPart >= BorrowRecord.idCounter) {
        BorrowRecord.idCounter = numPart + 1;
      }
    } else {
      BorrowRecord.idCounter++;
      this.recordId = `R${BorrowRecord.idCounter}`;
    }

    this.itemId = itemId;
    this.itemTitle = itemTitle;
    this.category = category;
    this.borrowerId = borrowerId;
    this.borrowerName = borrowerName;
    this.lenderId = lenderId;
    this.lenderName = lenderName;
    this.borrowDate = borrowDate;
    this.dueDate = dueDate;
    this.returnDate = returnDate;
    this.status = status;
    this.daysLate = daysLate;
    this.fineAmount = fineAmount;
    this.finePaid = finePaid;
    this.pickupNote = pickupNote;
    this.pickupSlot = pickupSlot;
    this.borrowerMobile = borrowerMobile;
    this.extraProofType = extraProofType;
    this.extraProofNote = extraProofNote;
    this.borrowerRatingGiven = borrowerRatingGiven;
    this.lenderRatingGiven = lenderRatingGiven;
    this.borrowerFeedback = borrowerFeedback;
    this.lenderFeedback = lenderFeedback;
  }

  public getRecordId(): string { return this.recordId; }
  public getItemId(): string { return this.itemId; }
  public getItemTitle(): string { return this.itemTitle; }
  public getCategory(): ItemCategory { return this.category; }
  public getBorrowerId(): string { return this.borrowerId; }
  public getBorrowerName(): string { return this.borrowerName; }
  public getLenderId(): string { return this.lenderId; }
  public getLenderName(): string { return this.lenderName; }
  public getBorrowDate(): string { return this.borrowDate; }
  public getDueDate(): string { return this.dueDate; }
  public getReturnDate(): string | null { return this.returnDate; }
  public getStatus(): BorrowStatus { return this.status; }
  public getDaysLate(): number { return this.daysLate; }
  public getFineAmount(): number { return this.fineAmount; }
  public isFinePaid(): boolean { return this.finePaid; }
  public getPickupNote(): string | undefined { return this.pickupNote; }
  public getPickupSlot(): string | undefined { return this.pickupSlot; }
  public getBorrowerMobile(): string | undefined { return this.borrowerMobile; }
  public getExtraProofType(): string | undefined { return this.extraProofType; }
  public getExtraProofNote(): string | undefined { return this.extraProofNote; }
  public getBorrowerRatingGiven(): number | undefined { return this.borrowerRatingGiven; }
  public getLenderRatingGiven(): number | undefined { return this.lenderRatingGiven; }
  public getBorrowerFeedback(): string | undefined { return this.borrowerFeedback; }
  public getLenderFeedback(): string | undefined { return this.lenderFeedback; }

  public setReturnDate(date: string): void {
    this.returnDate = date;
    this.status = 'RETURNED';
  }

  public setReturned(date: string, daysLate: number, fine: number): void {
    this.returnDate = date;
    this.daysLate = daysLate;
    this.fineAmount = fine;
    this.status = 'RETURNED';
  }

  public markOverdue(): void {
    if (this.status === 'ACTIVE') {
      this.status = 'OVERDUE';
    }
  }

  public setDaysLate(days: number): void {
    this.daysLate = days;
  }

  public setFineAmount(amt: number): void {
    this.fineAmount = amt;
  }

  public setFinePaid(paid: boolean): void {
    this.finePaid = paid;
  }

  public setStatus(st: BorrowStatus): void {
    this.status = st;
  }

  public setBorrowerRating(rating: number, feedback?: string): void {
    this.borrowerRatingGiven = rating;
    if (feedback) this.borrowerFeedback = feedback;
  }

  public rateByBorrower(rating: number, feedback?: string): void {
    this.setBorrowerRating(rating, feedback);
  }

  public setLenderRating(rating: number, feedback?: string): void {
    this.lenderRatingGiven = rating;
    if (feedback) this.lenderFeedback = feedback;
  }

  public rateByLender(rating: number, feedback?: string): void {
    this.setLenderRating(rating, feedback);
  }

  public toDTO(): BorrowRecordDTO {
    return {
      recordId: this.recordId,
      itemId: this.itemId,
      itemTitle: this.itemTitle,
      category: this.category,
      borrowerId: this.borrowerId,
      borrowerName: this.borrowerName,
      lenderId: this.lenderId,
      lenderName: this.lenderName,
      borrowDate: this.borrowDate,
      dueDate: this.dueDate,
      returnDate: this.returnDate,
      status: this.status,
      daysLate: this.daysLate,
      fineAmount: this.fineAmount,
      finePaid: this.finePaid,
      pickupNote: this.pickupNote,
      pickupSlot: this.pickupSlot,
      borrowerMobile: this.borrowerMobile,
      extraProofType: this.extraProofType,
      extraProofNote: this.extraProofNote,
      borrowerRatingGiven: this.borrowerRatingGiven,
      lenderRatingGiven: this.lenderRatingGiven,
      borrowerFeedback: this.borrowerFeedback,
      lenderFeedback: this.lenderFeedback
    };
  }

  public static fromDTO(dto: BorrowRecordDTO): BorrowRecord {
    return new BorrowRecord(
      dto.itemId,
      dto.itemTitle,
      dto.category,
      dto.borrowerId,
      dto.borrowerName,
      dto.lenderId,
      dto.lenderName,
      dto.borrowDate,
      dto.dueDate,
      dto.recordId,
      dto.returnDate,
      dto.status,
      dto.daysLate,
      dto.fineAmount,
      dto.finePaid,
      dto.pickupNote,
      dto.pickupSlot,
      dto.borrowerMobile,
      dto.extraProofType,
      dto.extraProofNote,
      dto.borrowerRatingGiven,
      dto.lenderRatingGiven,
      dto.borrowerFeedback,
      dto.lenderFeedback
    );
  }
}
