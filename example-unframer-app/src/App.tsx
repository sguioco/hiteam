import './framer/styles.css'

import TestimonialCardFramerComponent from './framer/testimonial-card'
import NavFramerComponent from './framer/nav'
import FooterAndCtaFramerComponent from './framer/footer-and-cta'
import OurPartnersLogoFramerComponent from './framer/our-partners-logo'
import OurPricingFramerComponent from './framer/our-pricing'
import CaptionButtonFramerComponent from './framer/caption-button'
import BrandingCardFramerComponent from './framer/branding-card'
import HowItSWorkCardFramerComponent from './framer/how-it-s-work-card'
import ButtonFramerComponent from './framer/button'

export default function App() {
  return (
    <div className='flex flex-col items-center gap-3 bg-[rgb(242,_246,_255)]'>
      <TestimonialCardFramerComponent.Responsive
        K4_BWCmLs={"Incredible work! The team at Deflow transformed our outdated website into a sleek, modern masterpiece. Our site now  performs exceptionally well.  The team at Deflow transformed our outdated website into a sleek, modern masterpiece. Our site now  performs exceptionally well. website into a sleek, modern masterpiece. Highly recommend their services!\""}
        kfCv3vezO={"Women's Bags"}
        mUN0rNmUd={"Author name"}
      />
      <NavFramerComponent.Responsive/>
      <FooterAndCtaFramerComponent.Responsive/>
      <OurPartnersLogoFramerComponent.Responsive
        wDu8SLtL7={"Elevate your company with us, just like 100+ others"}
      />
      <OurPricingFramerComponent.Responsive/>
      <CaptionButtonFramerComponent.Responsive
        Drur3Isxs={"rgb(255, 255, 255)"}
        Pli8bMfBJ={true}
        siRsUxlcm={"Build better sass website"}
        t3GkMWijW={"rgb(0, 0, 0)"}
      />
      <BrandingCardFramerComponent.Responsive
        JPSigCg4t={"rgb(20, 10, 62)"}
        Lt6xZrS3W={"rgb(69, 76, 82)"}
        OlCqilqX3={"Time tracking and reporting"}
        SGZUNtUNN={"rgb(20, 10, 62)"}
        VmAubf5Vg={"Also to image Seas Great day sea don't creature creatures land you're morning."}
        ycGpFRhMQ={"rgb(255, 255, 255)"}
      />
      <HowItSWorkCardFramerComponent.Responsive
        A8LLEHKOz={"0px 0px 0px 0px"}
        JLFzzKZ3u={"Behold upon Him God a creature fruitful Fly That seasons tree Isn't fruit also lesser brought."}
        T2JKVeut2={"rgb(255, 255, 255)"}
        VkwphK_am={"rgb(69, 76, 82)"}
        WP7dPYZhq={"rgb(20, 10, 62)"}
        bkiS1W6hS={"Sign up"}
      />
      <ButtonFramerComponent.Responsive
        RLoqfFjRC={"/contact-us"}
        rfFF_d5OS={"Try For Free"}
        zjfJ_dvfV={true}
      />
    </div>
  );
};