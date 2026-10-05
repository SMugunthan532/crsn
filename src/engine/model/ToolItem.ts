/**
 * model/Tool.java equivalent
 * Extends Item: 3 days duration, $5.00/day fine rate
 */
import { ItemCategory } from '../../types';
import { Item } from './Item';

export class ToolItem extends Item {
  private powerType: 'Cordless Battery' | 'Electric Corded' | 'Manual';

  constructor(
    title: string,
    description: string,
    ownerId: string,
    ownerName: string,
    locality: string,
    itemId?: string,
    isAvailable: boolean = true,
    powerType: 'Cordless Battery' | 'Electric Corded' | 'Manual' = 'Manual',
    dateAdded?: string,
    condition?: 'Like New' | 'Good' | 'Fair'
  ) {
    super(title, description, ownerId, ownerName, locality, itemId, isAvailable, dateAdded, condition);
    this.powerType = powerType;
  }

  public getCategory(): ItemCategory {
    return 'Tool';
  }

  public getBorrowDuration(): number {
    return 3; // 3 Days
  }

  public getDailyFineRate(): number {
    return 5.0; // $5/day
  }

  public getPowerType(): string {
    return this.powerType;
  }
}
