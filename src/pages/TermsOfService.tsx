import { Layout } from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shield, Package, AlertTriangle, CheckCircle } from 'lucide-react';

const PROHIBITED_ITEMS = [
  { en: 'Weapons, firearms, and ammunition', ar: 'الأسلحة والذخائر' },
  { en: 'Explosives and flammable materials', ar: 'المتفجرات والمواد القابلة للاشتعال' },
  { en: 'Lithium batteries (standalone)', ar: 'بطاريات الليثيوم المنفردة' },
  { en: 'Drugs and controlled substances', ar: 'المخدرات والمواد المخدرة' },
  { en: 'Counterfeit products', ar: 'البضاعة المقلدة' },
  { en: 'Chemical and biological materials', ar: 'المواد الكيميائية والبيولوجية' },
  { en: 'Perishable food items', ar: 'المواد الغذائية القابلة للتلف' },
  { en: 'Live animals', ar: 'الحيوانات الحية' },
  { en: 'Currency and negotiable instruments', ar: 'العملات والأوراق المالية' },
  { en: 'Pornographic materials', ar: 'المواد الإباحية' },
];

const HOW_IT_WORKS = [
  {
    en: 'You submit the product link and we confirm availability and price.',
    ar: 'تقوم بإرسال رابط المنتج وتأكيد التفاصيل.',
  },
  {
    en: 'You pay a deposit upfront. The remaining balance is due upon delivery.',
    ar: 'تدفع عربوناً مقدماً والباقي عند استلام المنتج.',
  },
  {
    en: 'We purchase and ship from the US to our warehouse, then to your door.',
    ar: 'نشتري المنتج ونشحنه من أمريكا إلى مستودعنا ثم إليك.',
  },
  {
    en: 'Delivery takes 7–21 business days depending on location.',
    ar: 'يستغرق التوصيل 7-21 يوم عمل حسب الموقع.',
  },
  {
    en: 'Customs and import duties are included in the final price.',
    ar: 'رسوم الجمارك مشمولة في السعر النهائي.',
  },
  {
    en: 'We are not responsible for delays caused by customs authorities.',
    ar: 'لا نتحمل المسؤولية عن التأخيرات الناجمة عن الجمارك.',
  },
];

export default function TermsOfService() {
  const { lang, isRtl } = useLanguage();

  return (
    <Layout>
      <div className="container py-12 max-w-3xl" dir={isRtl ? 'rtl' : 'ltr'}>

        {/* العنوان */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-3">
            {lang === 'ar' ? 'شروط الخدمة واتفاقية الاستخدام' : 'Terms of Service & Usage Agreement'}
          </h1>
          <p className="text-muted-foreground">
            {lang === 'ar'
              ? 'يرجى قراءة هذه الشروط بعناية قبل استخدام خدماتنا'
              : 'Please read these terms carefully before using our services'}
          </p>
        </div>

        {/* كيف يعمل النظام */}
        <div className="rounded-2xl bg-card border border-border p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">
              {lang === 'ar' ? 'كيف تعمل الخدمة' : 'How Our Service Works'}
            </h2>
          </div>
          <ul className="space-y-3">
            {HOW_IT_WORKS.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm">{lang === 'ar' ? item.ar : item.en}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* المواد المحظورة */}
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="font-semibold text-lg text-destructive">
              {lang === 'ar' ? 'المواد الممنوع شحنها' : 'Prohibited Items — Cannot Be Shipped'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROHIBITED_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-destructive/5 rounded-lg">
                <span className="text-destructive text-xs">✗</span>
                <span className="text-sm">{lang === 'ar' ? item.ar : item.en}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            {lang === 'ar'
              ? '⚠️ أي طلب يحتوي على مواد محظورة سيتم إلغاؤه فوراً دون استرداد الوديعة.'
              : '⚠️ Any order containing prohibited items will be cancelled immediately without refund of deposit.'}
          </p>
        </div>

        {/* سياسة الإلغاء */}
        <div className="rounded-2xl bg-card border border-border p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">
            {lang === 'ar' ? 'سياسة الإلغاء والاسترداد' : 'Cancellation & Refund Policy'}
          </h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              {lang === 'ar'
                ? '• يمكن إلغاء الطلب قبل الشراء من الموقع الأمريكي فقط.'
                : '• Orders can only be cancelled before purchase from the US store.'}
            </p>
            <p>
              {lang === 'ar'
                ? '• بعد الشراء لا يمكن إلغاء الطلب وتُطبق سياسة الإعادة الخاصة بالمتجر الأمريكي.'
                : '• After purchase, cancellation is not possible. The US store return policy applies.'}
            </p>
            <p>
              {lang === 'ar'
                ? '• في حال وجود مشكلة في المنتج، يرجى التواصل معنا خلال 48 ساعة من الاستلام.'
                : '• In case of product issues, contact us within 48 hours of delivery.'}
            </p>
          </div>
        </div>

        {/* الموافقة */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">
            {lang === 'ar'
              ? 'باستخدامك لخدمات Egate Shopping فإنك توافق على جميع الشروط المذكورة أعلاه.'
              : 'By using Egate Shopping services, you agree to all terms mentioned above.'}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {lang === 'ar' ? 'آخر تحديث: مارس 2026' : 'Last updated: March 2026'}
          </p>
        </div>
      </div>
    </Layout>
  );
}
