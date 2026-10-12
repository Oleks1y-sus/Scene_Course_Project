import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Brands from '@/components/Brands';
import Experience from '@/components/Experience';
import Quote from '@/components/Quote';
import Studio from '@/components/Studio';
import Revenue from '@/components/Revenue';
import HowItWorks from '@/components/HowItWorks';
import Integration from '@/components/Integration';
import Testimonials from '@/components/Testimonials';
import Opportunities from '@/components/Opportunities';
import Articles from '@/components/Articles';
import Events from '@/components/Events';
import Newsletter from '@/components/Newsletter';
import ExperienceWelcome from '@/components/ExperienceWelcome';
import Footer from '@/components/Footer';
import DemoModal from '@/components/DemoModal';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Brands />
        <Experience />
        <Quote />
        <Studio />
        <Revenue />
        <HowItWorks />
        <Integration />
        <Testimonials />
        <Opportunities />
        <Articles />
        <Events />
        <Newsletter />
        <ExperienceWelcome />
      </main>
      <Footer />
      <DemoModal />
    </>
  );
}