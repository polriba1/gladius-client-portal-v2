import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Globe, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const Header = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
      return;
    }
    
    toast({
      title: t('common.success'),
      description: t('auth.logout'),
    });
    
    navigate("/");
  };

  return (
    <header className="bg-background border-b border-border shadow-elegant">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">G</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">GladiusAI</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <LanguageSwitcher />
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="h-8"
          >
            <LogOut className="h-4 w-4 mr-1" />
            {t('header.logout')}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;