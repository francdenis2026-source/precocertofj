import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ComparisonItem {
  id: string;
  name: string;
  price: number;
  marketName: string;
}

interface ComparisonListState {
  items: ComparisonItem[];
  addItem: (item: ComparisonItem) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export const useComparisonList = create<ComparisonListState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item: ComparisonItem) => set((state: ComparisonListState) => {
        if (state.items.find((i: ComparisonItem) => i.id === item.id)) return state;
        return { items: [...state.items, item] };
      }),
      removeItem: (id: string) => set((state: ComparisonListState) => ({
        items: state.items.filter((i: ComparisonItem) => i.id !== id)
      })),
      clear: () => set({ items: [] }),
    }),
    { 
      name: 'pc-comparison-list',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
