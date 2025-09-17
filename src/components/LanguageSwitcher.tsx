import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';
import { useLanguage, Language } from '@/contexts/LanguageContext';

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  const getLanguageLabel = (lang: Language) => {
    switch (lang) {
      case 'es':
        return 'Español';
      case 'ca':
        return 'Català';
      default:
        return lang;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 px-0" aria-label="Toggle language">
          <Languages className="h-4 w-4" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleLanguageChange('es')}
          className={language === 'es' ? 'bg-accent' : ''}
        >
          {getLanguageLabel('es')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange('ca')}
          className={language === 'ca' ? 'bg-accent' : ''}
        >
          {getLanguageLabel('ca')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

