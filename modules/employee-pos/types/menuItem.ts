import { ModifierGroup } from './modifier';

export type MenuItemType = 'simple' | 'combo' | 'modifier';

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  image: string;
  price: number;
  badge?: 'Popular' | 'Best Seller' | 'New' | null;
  isPopular?: boolean;
  itemType: MenuItemType;
  modifierGroupIds?: string[];
  modifierGroups?: ModifierGroup[];
}
