/**
 * repository/BorrowRepository.java equivalent
 * Demonstrates Collections Framework: ArrayList<BorrowRecord>
 */
import { BorrowRecordDTO } from '../../types';
import { BorrowRecord } from '../model/BorrowRecord';

export class BorrowRepository {
  private static instance: BorrowRepository;
  private records: BorrowRecord[] = [];
  private readonly STORAGE_KEY = 'crsn_borrow_records';

  private constructor() {}

  public static getInstance(): BorrowRepository {
    if (!BorrowRepository.instance) {
      BorrowRepository.instance = new BorrowRepository();
    }
    return BorrowRepository.instance;
  }

  public save(record: BorrowRecord): BorrowRecord {
    const idx = this.records.findIndex(r => r.getRecordId() === record.getRecordId());
    if (idx >= 0) {
      this.records[idx] = record;
    } else {
      this.records.unshift(record); // newest first
    }
    this.persist();
    return record;
  }

  public findById(recordId: string): BorrowRecord | undefined {
    return this.records.find(r => r.getRecordId() === recordId);
  }

  public findByBorrower(borrowerId: string): BorrowRecord[] {
    return this.records.filter(r => r.getBorrowerId() === borrowerId);
  }

  public findByLender(lenderId: string): BorrowRecord[] {
    return this.records.filter(r => r.getLenderId() === lenderId);
  }

  public findActiveByBorrower(borrowerId: string): BorrowRecord[] {
    return this.records.filter(
      r => r.getBorrowerId() === borrowerId && (r.getStatus() === 'ACTIVE' || r.getStatus() === 'OVERDUE')
    );
  }

  public findActiveByItem(itemId: string): BorrowRecord | undefined {
    return this.records.find(
      r => r.getItemId() === itemId && (r.getStatus() === 'ACTIVE' || r.getStatus() === 'OVERDUE')
    );
  }

  public findAll(): BorrowRecord[] {
    return [...this.records];
  }

  public loadFromDTOs(dtos: BorrowRecordDTO[]): void {
    this.records = dtos.map(dto => BorrowRecord.fromDTO(dto));
  }

  public persist(): void {
    try {
      const dtos = this.records.map(r => r.toDTO());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dtos));
    } catch {
      // ignore
    }
  }

  public loadFromStorage(): boolean {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const dtos: BorrowRecordDTO[] = JSON.parse(raw);
        if (dtos && dtos.length > 0) {
          this.loadFromDTOs(dtos);
          return true;
        }
      }
    } catch {
      // fallback
    }
    return false;
  }
}
