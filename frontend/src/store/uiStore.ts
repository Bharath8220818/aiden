import { create } from 'zustand';

interface UIState {
  isSidebarCollapsed: boolean;
  isMobileNavOpen: boolean;
  isAskAidenOpen: boolean;
  isCommandPaletteOpen: boolean;
  isNotificationDrawerOpen: boolean;
  
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileNav: () => void;
  setMobileNavOpen: (open: boolean) => void;
  closeMobileNav: () => void;
  
  openAskAiden: () => void;
  closeAskAiden: () => void;
  toggleAskAiden: () => void;
  
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  
  openNotificationDrawer: () => void;
  closeNotificationDrawer: () => void;
  toggleNotificationDrawer: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  isMobileNavOpen: false,
  isAskAidenOpen: false,
  isCommandPaletteOpen: false,
  isNotificationDrawerOpen: false,

  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  toggleMobileNav: () => set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),
  setMobileNavOpen: (open) => set({ isMobileNavOpen: open }),
  closeMobileNav: () => set({ isMobileNavOpen: false }),

  openAskAiden: () => set({ isAskAidenOpen: true, isCommandPaletteOpen: false, isNotificationDrawerOpen: false }),
  closeAskAiden: () => set({ isAskAidenOpen: false }),
  toggleAskAiden: () => set((state) => ({ isAskAidenOpen: !state.isAskAidenOpen })),

  openCommandPalette: () => set({ isCommandPaletteOpen: true, isAskAidenOpen: false, isNotificationDrawerOpen: false }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  openNotificationDrawer: () => set({ isNotificationDrawerOpen: true }),
  closeNotificationDrawer: () => set({ isNotificationDrawerOpen: false }),
  toggleNotificationDrawer: () => set((state) => ({ isNotificationDrawerOpen: !state.isNotificationDrawerOpen })),
}));
