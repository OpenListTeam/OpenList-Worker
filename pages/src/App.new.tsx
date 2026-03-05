/**
 * OpenList 前端入口
 * 全局 Provider 配置：主题 / 国际化 / 路由
 */
import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { router } from './router.new';
import { useThemeStore, useLangStore } from './store';
import { getThemeConfig } from './theme/antdTheme';
import { AppProvider } from './components/AppContext';
import './i18n';

// 全局样式
import './styles/global.css';

const AppRoot: React.FC = () => {
  const { themeMode, themePreference } = useThemeStore();
  const { language } = useLangStore();

  // 监听系统主题变化
  useEffect(() => {
    if (themePreference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      useThemeStore.getState().setThemePreference('system');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themePreference]);

  // 语言变化时同步i18n
  useEffect(() => {
    import('i18next').then(i18n => {
      if (i18n.default.language !== language) {
        i18n.default.changeLanguage(language);
      }
    });
  }, [language]);

  // 透明模式添加body class
  useEffect(() => {
    document.body.className = `theme-${themeMode}`;
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const themeConfig = getThemeConfig(themeMode);
  const locale = language === 'en-US' ? enUS : zhCN;

  return (
    <AppProvider>
      <ConfigProvider theme={themeConfig} locale={locale}>
        <AntdApp>
          <RouterProvider router={router} />
        </AntdApp>
      </ConfigProvider>
    </AppProvider>
  );
};

export default AppRoot;
