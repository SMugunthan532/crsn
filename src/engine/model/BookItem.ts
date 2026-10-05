/**
 * model/Book.java equivalent
 * Extends Item: 14 days duration, $1.00/day fine rate
 */
import { ItemCategory } from '../../types';
import { Item } from './Item';

export class BookItem extends Item {
  private author: string;
  private isbnOrEdition: string;

  constructor(
    title: string,
    description: string,
    ownerId: string,
    ownerName: string,
    locality: string,
    author: string = 'Unknown Author',
    isbnOrEdition: string = 'Standard Edition',
    itemId?: string,
    isAvailable: boolean = true,
    dateAdded?: string,
    condition?: 'Like New' | 'Good' | 'Fair'
  ) {
    super(title, description, ownerId, ownerName, locality, itemId, isAvailable, dateAdded, condition);
    this.author = author;
    this.isbnOrEdition = isbnOrEdition;
  }

  public getCategory(): ItemCategory {
    return 'Book';
  }

  public getBorrowDuration(): number {
    return 14; // 14 Days
  }

  public getDailyFineRate(): number {
    return 1.0; // $1.00/day
  }

  public getAuthor(): string {
    return this.author;
  }

  public getIsbnOrEdition(): string {
    return this.isbnOrEdition;
  }
}
