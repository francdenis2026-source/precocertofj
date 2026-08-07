import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ComparisonListState {
  items: Array<{ id: string; name: string; price: number; marketName: string }>;
  addItem: (item: { id: string; name: string; price: number; marketName: string }) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export const useComparisonList = create<ComparisonListState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => {
        if (state.items.find(i => i.id === item.id)) return state;
        return { items: [...state.items, item] };
      }),
      removeItem: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id)
      })),
      clear: () => set({ items: [] }),
    }),
    { name: 'pc-comparison-list' }
  )
);
