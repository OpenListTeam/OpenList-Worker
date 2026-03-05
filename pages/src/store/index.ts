/**
 * 全局状态管理 — Zustand Store
 * 管理主题、语言、用户认证、侧边栏状态
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ========================================================================
// 主题模式
// ========================================================================
export type ThemeMode = 'light' | 'dark' | 'transparent';
export type ThemePreference = ThemeMode | 'system';

interface ThemeState {
  themePreference: ThemePreference;
  themeMode: ThemeMode;
  setThemePreference: (pref: ThemePreference) => void;
}

function getSystemTheme(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function resolveTheme(pref: ThemePreference): ThemeMode {
  return pref === 'system' ? getSystemTheme() : pref;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      themeMode: getSystemTheme(),
      setThemePreference: (pref) => set({
        themePreference: pref,
        themeMode: resolveTheme(pref),
      }),
    }),
    { name: 'openlist-theme' }
  )
);

// ========================================================================
// 语言
// ========================================================================
interface LangState {
  language: string;
  setLanguage: (lang: string) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      language: 'zh-CN',
      setLanguage: (lang) => set({ language: lang }),
    }),
    { name: 'openlist-lang' }
  )
);

// ========================================================================
// 用户认证
// ========================================================================
interface UserInfo {
  users_name: string;
  users_mail?: string;
  users_mask?: string;
  total_size?: number;
  total_used?: number;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: UserInfo | null;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  updateUser: (user: Partial<UserInfo>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      user: null,
      login: (token, user) => set({
        isAuthenticated: true,
        token,
        user,
      }),
      logout: () => set({
        isAuthenticated: false,
        token: null,
        user: null,
      }),
      updateUser: (partial) => set((state) => ({
        user: state.user ? { ...state.user, ...partial } : null,
      })),
    }),
    { name: 'openlist-auth' }
  )
);

// ========================================================================
// 侧边栏状态
// ========================================================================
interface SidebarState {
  collapsed: boolean;
  mobileOpen: boolean;
  activeGroup: string;
  toggleCollapsed: () => void;
  setCollapsed: (val: boolean) => void;
  setMobileOpen: (val: boolean) => void;
  setActiveGroup: (group: string) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      mobileOpen: false,
      activeGroup: 'files',
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (val) => set({ collapsed: val }),
      setMobileOpen: (val) => set({ mobileOpen: val }),
      setActiveGroup: (group) => set({ activeGroup: group }),
    }),
    { name: 'openlist-sidebar' }
  )
);
