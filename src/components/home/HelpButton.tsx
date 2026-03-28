import { MessageCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const WHATSAPP_NUMBER = '9647709651092';

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { t, lang } = useLanguage();

  const options = [
    { key: 'findProduct', msgEn: 'Hello! I need help finding a product.', msgAr: 'مرحبا! أحتاج مساعدة في إيجاد منتج.' },
    { key: 'trackOrder', msgEn: 'Hello! I need help tracking my order.', msgAr: 'مرحبا! أحتاج مساعدة في تتبع طلبي.' },
    { key: 'askPricing', msgEn: 'Hello! I have a question about pricing.', msgAr: 'مرحبا! عندي سؤال عن الأسعار.' },
    { key: 'otherQuestion', msgEn: 'Hello! I have a question.', msgAr: 'مرحبا! عندي سؤال.' },
  ];

  const openWhatsApp = (msg: string) => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="bg-card border border-border rounded-2xl shadow-lg p-4 w-64 animate-fade-in">
          <p className="font-semibold text-sm mb-3">{t('needHelp')} 👋</p>
          <div className="space-y-2">
            {options.map(({ key, msgEn, msgAr }) => (
              <button key={key}
                onClick={() => openWhatsApp(lang === 'ar' ? msgAr : msgEn)}
                className="w-full text-left text-sm px-3 py-2 rounded-lg bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors">
                {t(key as any)}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">{t('replyFast')}</p>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white font-medium text-sm
          transition-all duration-200 hover:scale-105
          ${isOpen ? 'bg-muted-foreground' : 'bg-green-500 hover:bg-green-600'}`}
      >
        {isOpen
          ? <><X className="h-5 w-5" />{t('close')}</>
          : <><MessageCircle className="h-5 w-5" />{t('needHelp')}</>}
      </button>
    </div>
  );
}