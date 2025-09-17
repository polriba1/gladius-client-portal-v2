import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Import translation files
import esTranslations from '@/locales/es.json';
import caTranslations from '@/locales/ca.json';

export type Language = 'es' | 'ca';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: unknown;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  es: esTranslations,
  ca: caTranslations
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('es'); // Default to Spanish
  const [isInitialized, setIsInitialized] = useState(false);

  // Load language from localStorage and detect Salutdental users on mount
  useEffect(() => {
    const initializeLanguage = async () => {
      // First check if there's a saved language preference
      const savedLanguage = localStorage.getItem('app_language') as Language;
      
      if (savedLanguage && (savedLanguage === 'es' || savedLanguage === 'ca')) {
        setLanguage(savedLanguage);
        setIsInitialized(true);
        return;
      }

      // If no saved preference, check if user is Salutdental and default to Catalan
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select(`
              client_id,
              clients!profiles_client_id_fkey (
                nom
              )
            `)
            .eq('id', user.id)
            .single();

          const clientName = data?.clients?.nom?.toLowerCase();
          
          if (clientName?.includes('salutdental')) {
            setLanguage('ca'); // Set Catalan as default for Salutdental
            localStorage.setItem('app_language', 'ca');
          } else {
            setLanguage('es'); // Keep Spanish for other clients
            localStorage.setItem('app_language', 'es');
          }
        }
      } catch (error) {
        console.error('Error detecting client for language:', error);
        // Fallback to Spanish if there's an error
        setLanguage('es');
      }

      setIsInitialized(true);
    };

    initializeLanguage();
  }, []);

  // Save language to localStorage when changed
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app_language', lang);
  };

  // Translation function with nested key support and interpolation
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (typeof value !== 'string') {
      console.warn(`Translation key "${key}" not found for language "${language}"`);
      return key;
    }
    
    // Simple interpolation for {{key}} placeholders
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match: string, paramKey: string) => {
        return params[paramKey]?.toString() || match;
      });
    }
    
    return value;
  };

  return (
    <LanguageContext.Provider 
      value={{ 
        language, 
        setLanguage: handleSetLanguage, 
        t, 
        translations: translations[language] 
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    // Provide a fallback to prevent crashes during development
    console.warn('useLanguage must be used within a LanguageProvider. Falling back to default values.');
    return {
      language: 'es' as Language,
      setLanguage: () => {},
      t: (key: string) => key,
      translations: {}
    };
  }
  return context;
};