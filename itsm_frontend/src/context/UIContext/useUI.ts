// itsm_frontend/src/context/UIContext/useUI.ts
import { useContext } from 'react';
import { UIContext, type UIContextType } from './UIContext';

export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIContextProvider');
  }
  return context;
};
