import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import ErrorBoundary from './components/ErrorBoundary';
import { router } from './router.new';
import { useThemeStore, useLangStore } from './store';
import { getThemeConfig } from './theme/antdTheme';
import './i18n';

// 应用根组件
function App() {
  const { themeMode } = useThemeStore();
  const { language } = useLangStore();

  const locale = language === 'en-US' ? enUS : zhCN;
  const themeConfig = getThemeConfig(themeMode);

  return (
    <ErrorBoundary>
      <ConfigProvider
        locale={locale}
        theme={themeConfig}
      >
        <AntdApp>
          <RouterProvider router={router} />
        </AntdApp>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;