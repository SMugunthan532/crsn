/**
 * repository/ItemRepository.java equivalent
 * Demonstrates Collections Framework: ArrayList<Item>
 */
import { ItemCategory, ItemDTO } from '../../types';
import { Item } from '../model/Item';
import { createItemFromDTO } from '../model/ItemFactory';

export class ItemRepository {
  private static instance: ItemRepository;
  private items: Item[] = [];
  private readonly STORAGE_KEY = 'crsn_items_data';

  private constructor() {}

  public static getInstance(): ItemRepository {
    if (!ItemRepository.instance) {
      ItemRepository.instance = new ItemRepository();
    }
    return ItemRepository.instance;
  }

  public save(item: Item): Item {
    const idx = this.items.findIndex(i => i.getItemId() === item.getItemId());
    if (idx >= 0) {
      this.items[idx] = item;
    } else {
      this.items.push(item);
    }
    this.persist();
    return item;
  }

  public findById(itemId: string): Item | undefined {
    return this.items.find(i => i.getItemId() === itemId);
  }

  public deleteById(itemId: string): boolean {
    const initialLen = this.items.length;
    this.items = this.items.filter(i => i.getItemId() !== itemId);
    if (this.items.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  public findAll(): Item[] {
    return [...this.items];
  }

  public findByCategory(category: ItemCategory): Item[] {
    return this.items.filter(i => i.getCategory() === category);
  }

  public findAvailable(): Item[] {
    return this.items.filter(i => i.getIsAvailable());
  }

  public findByOwner(ownerId: string): Item[] {
    return this.items.filter(i => i.getOwnerId() === ownerId);
  }

  public findByLocality(locality: string): Item[] {
    const loc = locality.trim().toLowerCase();
    return this.items.filter(i => i.getLocality().toLowerCase().includes(loc));
  }

  public loadFromDTOs(dtos: ItemDTO[]): void {
    this.items = dtos.map(dto => createItemFromDTO(dto));
  }

  public persist(): void {
    try {
      const dtos = this.items.map(i => i.toDTO());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dtos));
    } catch {
      // ignore
    }
  }

  public loadFromStorage(): boolean {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const dtos: ItemDTO[] = JSON.parse(raw);
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
