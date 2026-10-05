/**
 * model/Item.java equivalent
 * Demonstrates Abstraction & Polymorphism:
 * Abstract class defining the contract for all community items.
 */
import { ItemCategory, ItemDTO } from '../../types';

export abstract class Item {
  protected static idCounter: number = 200;

  protected itemId: string;
  protected title: string;
  protected description: string;
  protected ownerId: string;
  protected ownerName: string;
  protected locality: string;
  protected isAvailable: boolean;
  protected dateAdded: string;
  protected condition: 'Like New' | 'Good' | 'Fair';

  constructor(
    title: string,
    description: string,
    ownerId: string,
    ownerName: string,
    locality: string,
    itemId?: string,
    isAvailable: boolean = true,
    dateAdded: string = new Date().toISOString().split('T')[0],
    condition: 'Like New' | 'Good' | 'Fair' = 'Good'
  ) {
    if (itemId) {
      this.itemId = itemId;
      const numPart = parseInt(itemId.replace(/\D/g, ''), 10);
      if (!isNaN(numPart) && numPart >= Item.idCounter) {
        Item.idCounter = numPart + 1;
      }
    } else {
      Item.idCounter++;
      this.itemId = `I${Item.idCounter}`;
    }

    this.title = title;
    this.description = description;
    this.ownerId = ownerId;
    this.ownerName = ownerName;
    this.locality = locality;
    this.isAvailable = isAvailable;
    this.dateAdded = dateAdded;
    this.condition = condition;
  }

  // Abstract methods to be overridden by concrete subclasses (Polymorphism & Abstraction)
  public abstract getCategory(): ItemCategory;
  public abstract getBorrowDuration(): number; // days allowed for borrowing
  public abstract getDailyFineRate(): number;  // $ per day late

  /**
   * Polymorphic fine calculation:
   * Fine = daysLate * categorySpecificDailyRate
   */
  public calculateFine(daysLate: number): number {
    if (daysLate <= 0) return 0;
    return Math.round(daysLate * this.getDailyFineRate() * 100) / 100;
  }

  // Common getters & setters
  public getItemId(): string { return this.itemId; }
  public getTitle(): string { return this.title; }
  public setTitle(title: string): void { this.title = title; }
  public getDescription(): string { return this.description; }
  public setDescription(desc: string): void { this.description = desc; }
  public getOwnerId(): string { return this.ownerId; }
  public getOwnerName(): string { return this.ownerName; }
  public getLocality(): string { return this.locality; }
  public setLocality(loc: string): void { this.locality = loc; }
  public getIsAvailable(): boolean { return this.isAvailable; }
  public setAvailable(avail: boolean): void { this.isAvailable = avail; }
  public getDateAdded(): string { return this.dateAdded; }
  public getCondition(): 'Like New' | 'Good' | 'Fair' { return this.condition; }

  public toDTO(): ItemDTO {
    return {
      itemId: this.itemId,
      title: this.title,
      category: this.getCategory(),
      description: this.description,
      ownerId: this.ownerId,
      ownerName: this.ownerName,
      locality: this.locality,
      isAvailable: this.isAvailable,
      borrowDurationDays: this.getBorrowDuration(),
      dailyFineRate: this.getDailyFineRate(),
      dateAdded: this.dateAdded,
      condition: this.condition,
    };
  }
}
