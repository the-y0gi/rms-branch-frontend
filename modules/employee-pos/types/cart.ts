import { SelectedModifier } from './modifier';

export interface CartItem {
  id: string; // unique composite key (menuItemId + optionIds joined)
  menuItemId: string;
  name: string;
  image?: string;
  basePrice: number;
  selectedModifiers: SelectedModifier[];
  quantity: number;
  totalPrice: number; // (basePrice + sum of modifier prices) * quantity
  note?: string;
}
