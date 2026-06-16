import SellerHeader from "@/components/seller_home/seller_header";
import SellerHero from "@/components/seller_home/seller_hero";
import SellerAbout from "@/components/seller_home/seller_about";
import SellerTestimonials from "@/components/seller_home/seller_testimonials";
import SellerBenefits from "@/components/seller_home/seller_benefits";
import SellerCalculator from "@/components/seller_home/seller_calculator";
import SellerFaq from "@/components/seller_home/seller_faq";
import SellerFooter from "@/components/seller_home/seller_footer";

export const metadata = {
  title: "EMAHU | Seller Hub",
  description: "Sell your products online with 0% commission on EMAHU.",
};

export default function SellerLanding() {
  return (
    <>
      <SellerHeader />
      <SellerHero />
      <SellerAbout />
      <SellerBenefits />
      <SellerCalculator />
      <SellerTestimonials />  
      <SellerFaq />
      <SellerFooter />
    </>
  );
}
