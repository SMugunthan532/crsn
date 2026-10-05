/**
 * service/ItemService.java equivalent
 * Encapsulates item inventory management, polymorphic instantiation, and ownership rules.
 */
import { ItemCategory, ItemDTO } from '../../types';
import { BookItem } from '../model/BookItem';
import { ElectronicsItem } from '../model/ElectronicsItem';
import { Item } from '../model/Item';
import { MedicalItem } from '../model/MedicalItem';
import { ToolItem } from '../model/ToolItem';
import { ItemRepository } from '../repository/ItemRepository';
import { FileManager } from '../util/FileManager';
import { Validation } from '../util/Validation';

export class ItemService {
  private itemRepo: ItemRepository = ItemRepository.getInstance();

  public addItem(
    title: string,
    category: ItemCategory,
    description: string,
    ownerId: string,
    ownerName: string,
    locality: string,
    extraDetail?: string,
    condition: 'Like New' | 'Good' | 'Fair' = 'Good'
  ): Item {
    const validTitle = Validation.validateNonEmpty(title, 'Item Title');
    const validDesc = Validation.validateNonEmpty(description, 'Description');
    const validLocality = Validation.validateNonEmpty(locality, 'Locality');

    let newItem: Item;
    switch (category) {
      case 'Tool':
        newItem = new ToolItem(
          validTitle,
          validDesc,
          ownerId,
          ownerName,
          validLocality,
          undefined,
          true,
          (extraDetail as any) || 'Electric Corded',
          undefined,
          condition
        );
        break;
      case 'Book':
        newItem = new BookItem(
          validTitle,
          validDesc,
          ownerId,
          ownerName,
          validLocality,
          extraDetail || 'Author not specified',
          'Standard Edition',
          undefined,
          true,
          undefined,
          condition
        );
        break;
      case 'MedicalEquipment':
        newItem = new MedicalItem(
          validTitle,
          validDesc,
          ownerId,
          ownerName,
          validLocality,
          extraDetail || new Date().toISOString().split('T')[0],
          undefined,
          true,
          undefined,
          condition
        );
        break;
      case 'Electronics':
        newItem = new ElectronicsItem(
          validTitle,
          validDesc,
          ownerId,
          ownerName,
          validLocality,
          extraDetail || 'Standard cables included',
          undefined,
          true,
          undefined,
          condition
        );
        break;
      default:
        throw new Error(`Unsupported item category: ${category}`);
    }

    this.itemRepo.save(newItem);

    FileManager.logTransaction(
      'ITEM_ADD',
      ownerId,
      ownerName,
      `Listed new item '${newItem.getTitle()}' [${newItem.getItemId()}] under category ${category}`
    );

    return newItem;
  }

  public deleteItem(itemId: string, requesterUserId: string): boolean {
    const item = this.itemRepo.findById(itemId);
    if (!item) {
      throw new Error(`Item with ID '${itemId}' does not exist.`);
    }

    // Strict ownership verification rule:
    if (item.getOwnerId() !== requesterUserId) {
      throw new Error(`Unauthorized Action: You can only delete items that you own.`);
    }

    if (!item.getIsAvailable()) {
      throw new Error(`Cannot delete item '${item.getTitle()}' while it is currently borrowed by someone.`);
    }

    const deleted = this.itemRepo.deleteById(itemId);
    if (deleted) {
      FileManager.logTransaction(
        'ITEM_DELETE',
        requesterUserId,
        item.getOwnerName(),
        `Deleted listed item '${item.getTitle()}' [${itemId}]`
      );
    }
    return deleted;
  }

  public getItemById(itemId: string): Item {
    const item = this.itemRepo.findById(itemId);
    if (!item) {
      throw new Error(`Item '${itemId}' not found in inventory.`);
    }
    return item;
  }

  public getAllItems(): Item[] {
    return this.itemRepo.findAll();
  }

  public getAvailableItems(): Item[] {
    return this.itemRepo.findAvailable();
  }

  public getItemsByCategory(category: ItemCategory): Item[] {
    return this.itemRepo.findByCategory(category);
  }

  public getItemsByLocality(locality: string): Item[] {
    return this.itemRepo.findByLocality(locality);
  }

  public getItemsByOwner(ownerId: string): Item[] {
    return this.itemRepo.findByOwner(ownerId);
  }

  public setAvailability(itemId: string, available: boolean): void {
    const item = this.getItemById(itemId);
    item.setAvailable(available);
    this.itemRepo.save(item);
  }
}
