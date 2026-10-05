import { ItemDTO } from '../../types';
import { BookItem } from './BookItem';
import { ElectronicsItem } from './ElectronicsItem';
import { Item } from './Item';
import { MedicalItem } from './MedicalItem';
import { ToolItem } from './ToolItem';

export function createItemFromDTO(dto: ItemDTO): Item {
  switch (dto.category) {
    case 'Tool':
      return new ToolItem(
        dto.title,
        dto.description,
        dto.ownerId,
        dto.ownerName,
        dto.locality,
        dto.itemId,
        dto.isAvailable,
        'Electric Corded',
        dto.dateAdded,
        dto.condition
      );
    case 'Book':
      return new BookItem(
        dto.title,
        dto.description,
        dto.ownerId,
        dto.ownerName,
        dto.locality,
        'Author / Publisher',
        'Standard Edition',
        dto.itemId,
        dto.isAvailable,
        dto.dateAdded,
        dto.condition
      );
    case 'MedicalEquipment':
      return new MedicalItem(
        dto.title,
        dto.description,
        dto.ownerId,
        dto.ownerName,
        dto.locality,
        new Date().toISOString().split('T')[0],
        dto.itemId,
        dto.isAvailable,
        dto.dateAdded,
        dto.condition
      );
    case 'Electronics':
      return new ElectronicsItem(
        dto.title,
        dto.description,
        dto.ownerId,
        dto.ownerName,
        dto.locality,
        'Cables & accessories included',
        dto.itemId,
        dto.isAvailable,
        dto.dateAdded,
        dto.condition
      );
    default:
      return new ToolItem(
        dto.title,
        dto.description,
        dto.ownerId,
        dto.ownerName,
        dto.locality,
        dto.itemId,
        dto.isAvailable
      );
  }
}
