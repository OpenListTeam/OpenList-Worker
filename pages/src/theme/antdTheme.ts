/**
 * Antd 主题配置 — 支持浅色、深色、透明三种模式
 * 使用 Space Grotesk + Noto Sans SC 字体组合
 */
import type { ThemeConfig } from 'antd';
import { theme } from 'antd';
import type { ThemeMode } from '../store';

// 品牌色系
const brandColors = {
  primary: '#3B82F6',         // 清澈蓝
  primaryHover: '#2563EB',
  primaryActive: '#1D4ED8',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#6366F1',
  accent: '#8B5CF6',         // 紫色点缀
};

// 浅色主题
export const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: brandColors.primary,
    colorSuccess: brandColors.success,
    colorWarning: brandColors.warning,
    colorError: brandColors.error,
    colorInfo: brandColors.info,
    borderRadius: 10,
    fontFamily: "'Space Grotesk', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F5F7FA',
    colorBgElevated: '#FFFFFF',
    colorBorder: '#E5E7EB',
    colorBorderSecondary: '#F0F0F0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    boxShadowSecondary: '0 4px 16px rgba(0, 0, 0, 0.08)',
    controlHeight: 38,
    wireframe: false,
  },
  components: {
    Layout: {
      siderBg: '#FFFFFF',
      headerBg: 'rgba(255, 255, 255, 0.85)',
      bodyBg: '#F5F7FA',
    },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemHoverBg: 'rgba(59, 130, 246, 0.06)',
      itemSelectedBg: 'rgba(59, 130, 246, 0.1)',
      itemSelectedColor: brandColors.primary,
      itemBorderRadius: 8,
      iconSize: 18,
      collapsedIconSize: 20,
    },
    Card: {
      borderRadiusLG: 12,
      paddingLG: 24,
    },
    Table: {
      headerBg: '#FAFBFC',
      headerBorderRadius: 8,
      borderColor: '#F0F0F0',
    },
    Button: {
      borderRadius: 8,
      controlHeight: 38,
      primaryShadow: '0 2px 6px rgba(59, 130, 246, 0.3)',
    },
    Input: {
      borderRadius: 8,
      controlHeight: 38,
    },
    Modal: {
      borderRadiusLG: 16,
    },
    Drawer: {
      borderRadiusLG: 16,
    },
  },
};

// 深色主题
export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: brandColors.primary,
    colorSuccess: brandColors.success,
    colorWarning: brandColors.warning,
    colorError: brandColors.error,
    colorInfo: brandColors.info,
    borderRadius: 10,
    fontFamily: "'Space Grotesk', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    colorBgContainer: '#1A1D23',
    colorBgLayout: '#111318',
    colorBgElevated: '#1F2229',
    colorBorder: '#2D3039',
    colorBorderSecondary: '#252830',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    boxShadowSecondary: '0 4px 16px rgba(0, 0, 0, 0.4)',
    controlHeight: 38,
    wireframe: false,
  },
  components: {
    Layout: {
      siderBg: '#1A1D23',
      headerBg: 'rgba(26, 29, 35, 0.9)',
      bodyBg: '#111318',
    },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemHoverBg: 'rgba(59, 130, 246, 0.1)',
      itemSelectedBg: 'rgba(59, 130, 246, 0.15)',
      itemSelectedColor: '#60A5FA',
      itemBorderRadius: 8,
      iconSize: 18,
      collapsedIconSize: 20,
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemHoverBg: 'rgba(59, 130, 246, 0.1)',
      darkItemSelectedBg: 'rgba(59, 130, 246, 0.15)',
    },
    Card: {
      borderRadiusLG: 12,
      paddingLG: 24,
    },
    Table: {
      headerBg: '#1F2229',
      headerBorderRadius: 8,
      borderColor: '#2D3039',
    },
    Button: {
      borderRadius: 8,
      controlHeight: 38,
      primaryShadow: '0 2px 6px rgba(59, 130, 246, 0.2)',
    },
    Input: {
      borderRadius: 8,
      controlHeight: 38,
    },
    Modal: {
      borderRadiusLG: 16,
    },
    Drawer: {
      borderRadiusLG: 16,
    },
  },
};

// 透明主题（玻璃态 — 基于深色）
export const transparentTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: brandColors.primary,
    colorSuccess: brandColors.success,
    colorWarning: brandColors.warning,
    colorError: brandColors.error,
    colorInfo: brandColors.info,
    borderRadius: 12,
    fontFamily: "'Space Grotesk', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    colorBgContainer: 'rgba(26, 29, 35, 0.65)',
    colorBgLayout: 'rgba(17, 19, 24, 0.5)',
    colorBgElevated: 'rgba(31, 34, 41, 0.75)',
    colorBorder: 'rgba(255, 255, 255, 0.08)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.05)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
    boxShadowSecondary: '0 8px 32px rgba(0, 0, 0, 0.3)',
    controlHeight: 38,
    wireframe: false,
  },
  components: {
    Layout: {
      siderBg: 'rgba(26, 29, 35, 0.6)',
      headerBg: 'rgba(26, 29, 35, 0.5)',
      bodyBg: 'transparent',
    },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemHoverBg: 'rgba(255, 255, 255, 0.06)',
      itemSelectedBg: 'rgba(59, 130, 246, 0.15)',
      itemSelectedColor: '#93C5FD',
      itemBorderRadius: 10,
      iconSize: 18,
      collapsedIconSize: 20,
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
      darkItemSelectedBg: 'rgba(59, 130, 246, 0.15)',
    },
    Card: {
      borderRadiusLG: 14,
      paddingLG: 24,
    },
    Table: {
      headerBg: 'rgba(31, 34, 41, 0.6)',
      headerBorderRadius: 10,
      borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    Button: {
      borderRadius: 10,
      controlHeight: 38,
      primaryShadow: '0 2px 12px rgba(59, 130, 246, 0.25)',
    },
    Input: {
      borderRadius: 10,
      controlHeight: 38,
    },
    Modal: {
      borderRadiusLG: 18,
    },
    Drawer: {
      borderRadiusLG: 18,
    },
  },
};

// 获取对应模式的主题配置
export function getThemeConfig(mode: ThemeMode): ThemeConfig {
  switch (mode) {
    case 'dark': return darkTheme;
    case 'transparent': return transparentTheme;
    default: return lightTheme;
  }
}
