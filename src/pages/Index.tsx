import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { StoreMarquee } from '@/components/home/StoreMarquee';
import { HowItWorks } from '@/components/home/HowItWorks';

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <StoreMarquee />
      <HowItWorks />
    </Layout>
  );
};

export default Index;
