import { create } from 'zustand';

interface UIState {
  isSidebarCollapsed: boolean;
  isMobileDrawerOpen: boolean;
  activeModal: string | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileDrawer: () => void;
  setMobileDrawerOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

const SIDEBAR_COLLAPSED_KEY = 'linkkwork_admin_sidebar_collapsed';

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  isMobileDrawerOpen: false,
  activeModal: null,

  toggleSidebar: () =>
    set((state) => {
      const next = !state.isSidebarCollapsed;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return { isSidebarCollapsed: next };
    }),

  setSidebarCollapsed: (collapsed: boolean) => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    set({ isSidebarCollapsed: collapsed });
  },

  toggleMobileDrawer: () =>
    set((state) => ({ isMobileDrawerOpen: !state.isMobileDrawerOpen })),

  setMobileDrawerOpen: (open: boolean) => set({ isMobileDrawerOpen: open }),

  openModal: (modalId: string) => set({ activeModal: modalId }),

  closeModal: () => set({ activeModal: null }),
}));
