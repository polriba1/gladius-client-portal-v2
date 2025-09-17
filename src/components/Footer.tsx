import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-muted border-t border-border mt-auto">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-center md:text-left">
            <h3 className="font-semibold text-foreground mb-2">{t('footer.contact')}</h3>
            <a 
              href={`mailto:${t('footer.email')}`}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {t('footer.email')}
            </a>
          </div>
          <div className="text-center md:text-right">
            <p className="text-muted-foreground text-sm">{t('footer.rights')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;