import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  selectedProfessionalId: string;
  selectedDate: string;
  selectedStatus: string;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSelectedProfessionalId: (id: string) => void;
  setSelectedDate: (date: string) => void;
  setSelectedStatus: (status: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  selectedProfessionalId: '',
  selectedDate: '',
  selectedStatus: '',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  setSelectedProfessionalId: (id) => set({ selectedProfessionalId: id }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedStatus: (status) => set({ selectedStatus: status }),
}));
