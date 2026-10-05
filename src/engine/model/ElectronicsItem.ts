/**
 * model/Electronics.java equivalent
 * Extends Item: 5 days duration, $8.00/day fine rate
 */
import { ItemCategory } from '../../types';
import { Item } from './Item';

export class ElectronicsItem extends Item {
  private includesAccessories: string;

  constructor(
    title: string,
    description: string,
    ownerId: string,
    ownerName: string,
    locality: string,
    includesAccessories: string = 'Standard cables included',
    itemId?: string,
    isAvailable: boolean = true,
    dateAdded?: string,
    condition?: 'Like New' | 'Good' | 'Fair'
  ) {
    super(title, description, ownerId, ownerName, locality, itemId, isAvailable, dateAdded, condition);
    this.includesAccessories = includesAccessories;
  }

  public getCategory(): ItemCategory {
    return 'Electronics';
  }

  public getBorrowDuration(): number {
    return 5; // 5 Days
  }

  public getDailyFineRate(): number {
    return 8.0; // $8.00/day
  }

  public getIncludesAccessories(): string {
    return this.includesAccessories;
  }
}
