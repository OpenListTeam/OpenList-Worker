import React from 'react';
import { useApp } from '../../components/AppContext.tsx';
import UnifiedFileManager from './UnifiedFileManager';

const MyFilesWrapper: React.FC = () => {
  const { state } = useApp();
  const username = state.user?.username || 'username';
  const defaultPath = `/@home/${username}/`;

  return (
    <UnifiedFileManager 
      defaultPath={defaultPath} 
      title="我的文件" 
    />
  );
};

export default MyFilesWrapper;