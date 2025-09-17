import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const next = language === 'es' ? 'ca' : 'es';
  const label = language === 'es' ? 'CA' : 'ES';
  return (
    <Button
      variant="outline"
      size="sm"
      className="px-3"
      onClick={() => setLanguage(next)}
      aria-label={`Change language to ${label}`}
    >
      {label}
    </Button>
  );
}

