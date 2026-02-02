import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { StoreMarquee } from '@/components/home/StoreMarquee';
import { HowItWorks } from '@/components/home/HowItWorks';
import { Testimonials } from '@/components/home/Testimonials';

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <StoreMarquee />
      <HowItWorks />
      <Testimonials />
    </Layout>
  );
};

export default Index;
