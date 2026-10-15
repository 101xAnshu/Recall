import { create } from "zustand";

type NavId = "ask" | "blast" | "who" | "approvals" | "memory";

type UiState = {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
};

export const useUiStore = create<UiState>()((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebarCollapsed: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));

export type { NavId };
