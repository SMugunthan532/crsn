/**
 * model/MedicalEquipment.java equivalent
 * Extends Item: 7 days duration, $10.00/day fine rate
 * Priority community resource with high accountability
 */
import { ItemCategory } from '../../types';
import { Item } from './Item';

export class MedicalItem extends Item {
  private sanitizedDate: string;

  constructor(
    title: string,
    description: string,
    ownerId: string,
    ownerName: string,
    locality: string,
    sanitizedDate: string = new Date().toISOString().split('T')[0],
    itemId?: string,
    isAvailable: boolean = true,
    dateAdded?: string,
    condition?: 'Like New' | 'Good' | 'Fair'
  ) {
    super(title, description, ownerId, ownerName, locality, itemId, isAvailable, dateAdded, condition);
    this.sanitizedDate = sanitizedDate;
  }

  public getCategory(): ItemCategory {
    return 'MedicalEquipment';
  }

  public getBorrowDuration(): number {
    return 7; // 7 Days
  }

  public getDailyFineRate(): number {
    return 10.0; // $10.00/day
  }

  public getSanitizedDate(): string {
    return this.sanitizedDate;
  }
}
