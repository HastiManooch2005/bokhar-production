
import { useState, useRef, useEffect } from "react";
import {
  FaInstagram,
  FaWhatsapp,
  FaLinkedinIn,
  FaGithub,
  FaXTwitter,
  FaEnvelope,
} from "react-icons/fa6";

const socialLinks = [
  {
    name: "Instagram",
    href: "#",
    icon: <FaInstagram />,
  },
  {
    name: "Whatsapp",
    href: "#",
    icon: <FaWhatsapp />,
  },
  {
    name: "LinkedIn",
    href: "#",
    icon: <FaLinkedinIn />,
  },
  {
    name: "Github",
    href: "#",
    icon: <FaGithub />,
  },
  {
    name: "X",
    href: "#",
    icon: <FaXTwitter />,
  },
  {
    name: "Email",
    href: "mailto:info@example.com",
    icon: <FaEnvelope />,
  },
];

const AboutUs = () => {
  const [showCollaboration, setShowCollaboration] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowCollaboration(true);
        }
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section className="w-full relative overflow-x-hidden">
      {/* بخش اول: لپ‌تاپ و دلیوری */}
      <div className="relative overflow-hidden">
        <div className="flex flex-row items-start pt-6 sm:pt-10 md:pt-14 mb-4">
          {/* لپ‌تاپ + باکس مشکی */}
          <div className="w-3/5 relative flex flex-col items-end pb-11 sm:pb-14 md:pb-18 lg:pb-20">
            <img
                src="/AboutUs/laptop.png"
                alt="Laptop"
                className="w-full object-contain md:pl-6"
            />

            {/* باکس مشکی - از لبه چپ صفحه تا انتهای div */}
            <div
                className="absolute bottom-0 left-0 -translate-y-0 bg-gray-800 rounded-full rounded-l-none h-11 sm:h-14 md:h-18 lg:h-20 flex items-center justify-center w-screen max-w-[67vw] z-10">
              <p className="text-gray-200 text-[12px] sm:text-xl md:text-2xl font-bold px-3 sm:px-5 md:px-8 text-center">
                فراتر از خشکشویی، همدم روزمرگی شما
              </p>
            </div>
          </div>

          {/* دلیوری + باکس بنفش */}
          <div
              className="w-2/5 relative flex flex-col items-end mt-22 sm:mt-44 md:mt-44 lg:mt-78 pb-9 sm:pb-14 md:pb-18 lg:pb-20">

            <img
                src="/AboutUs/delivery.svg"
                alt="Delivery"
                className="w-[80%] object-contain z-20"
            />

            {/* باکس بنفش - از لبه راست صفحه */}
            <div
                className="absolute bottom-0 right-0 bg-[#C1B2DD] rounded-full rounded-r-none h-9 sm:h-14 md:h-18 lg:h-20 flex items-center justify-center w-screen max-w-[40vw]">
              <p className="text-gray-900 text-[12px] sm:text-xl md:text-2xl font-bold">
                درباره ما
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* بخش سوم: داستان ما */}
      <div dir="rtl" className="w-full sm:mt-12 md:mt-20 pb-10">
        <div className="flex flex-col md:flex-row items-start gap-8 md:gap-12">
          {/* راست: هدر و متن */}
          <div className="w-full md:w-1/2 flex flex-col items-start px-4 sm:px-8 md:px-16">
            <div dir="ltr" className="flex items-center gap-3 mb-3 md:mb-8">
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                <span>داستان ما</span>
                <span className="inline-flex items-center justify-center w-7 h-7 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-full border-2 sm:border-3 md:border-4 border-gray-800 text-xl sm:text-2xl md:text-3xl flex-shrink-0">
                  !
                </span>
              </h2>
            </div>

            <p className="text-gray-600 text-right text-base sm:text-lg md:text-xl leading-relaxed md:leading-loose">
              روزانه پیشرفت‌های زیادی در عرصه تکنولوژی اتفاق می‌افته که هرکدام
              برای راحت‌تر کردن زندگی مردم هستند. از این رو وبسایت ما تحت عنوان
              بخار در تلاش است خدمات آنلاین برای صرفه جویی در زمان و راحتی مشتری
              را فراهم کند.
            </p>
          </div>

          {/* چپ: عکس */}
          <div className="w-[80%] md:w-1/2 flex justify-center md:justify-end mx-auto">

            <img
                src="/AboutUs/StoryImage.png"
                alt="Our Story"
                className="w-full max-w-xs sm:max-w-sm md:max-w-md object-contain rounded-3xl"
            />
          </div>
        </div>
      </div>

      {/* بخش چهارم: دو باکس مستقل زیر داستان */}
      <div
          dir="ltr"
          className="w-full flex flex-col items-start space-y-3 mt-2 md:mt-4 pb-10"
      >
        <div className="bg-gray-800 rounded-4xl rounded-l-none h-10 sm:h-12 w-5/7 flex items-center justify-center">
          <p className="text-gray-200 text-sm font-bold"></p>
        </div>
        <div className="bg-gray-800 rounded-4xl rounded-l-none h-10 sm:h-12 w-3/7 flex items-center justify-center">
          <p className="text-gray-900 text-sm font-bold"></p>
        </div>
      </div>

      {/* ارتباط و همکاری - پاراگراف */}
      <div
        dir="rtl"
        className="w-full flex justify-center sm:mt-16 md:mt-24 px-6 sm:px-8"
      >
        <p className="text-gray-700 text-start text-sm sm:text-base md:text-lg leading-relaxed w-full sm:w-4/5 md:w-1/2">
          تیم برنامه‌نویسی ما با نام{" "}
          <span className="font-bold text-gray-900">رایبان</span> از سال ۱۴۰۴ در
          حال فعالیت بوده و متشکل از دانشجویان برجسته‌ی دانشگاه بین‌المللی امام
          خمینی (ره) است. هدف ما از طراحی اپلیکیشن‌های تحت وب و موبایل، ارائه
          خدمات آنلاین با کیفیت به مردم عزیز و همچنین ساده‌سازی امور روزمره
          ایشان است. پلتفرم «بخار» نیز به همین امر برای راحتی و به‌روز بودن کار
          خشکشویی‌ها و مشتریان توسعه داده شده است.
        </p>
      </div>

      {/* بخش شبکه‌های اجتماعی - با انیمیشن اسکرول */}
      <div
        ref={sectionRef}
        className="w-full flex flex-col justify-center relative overflow-hidden mt-8 sm:mt-12"
      >
        <div className="flex flex-col-reverse w-full">

          {/* باکس پایینی (در نمایش): راه‌های ارتباط - z-index بالاتر */}
          <div
            className="w-full bg-sky-50 justify-center rounded-t-4xl shadow-md border border-gray-100
                       px-4 sm:px-8 py-6 sm:py-8 relative mb-12.5 z-20"
          >
            <h3 className="text-gray-800 text-center text-lg sm:text-xl md:text-2xl font-bold mb-6">
              راه‌های ارتباط با ما
            </h3>

            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-5 justify-items-center">
              {socialLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  aria-label={item.name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#F3EEF9] text-gray-800 flex items-center justify-center text-xl sm:text-2xl transition-all duration-300 hover:bg-[#C1B2DD] hover:-translate-y-1 hover:shadow-md"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>
          <div
            className={`flex flex-col mx-6 sm:mx-12 md:mx-20 bg-white justify-center items-center gap-1
                       px-2 sm:px-8 py-2 sm:py-8 rounded-t-4xl shadow-sm border border-gray-100
                       relative z-10 transition-all duration-1200 ease-out transform
                       ${showCollaboration ? 'translate-y-0 opacity-100' : 'translate-y-[100%] opacity-0'}`}
          >
            <h2 className="text-gray-800 text-center text-base sm:text-lg md:text-xl font-bold">
              ارتباط و همکاری
            </h2>
            <span className="p-4 text-center text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed max-w-3xl">
              تیم استارتاپی رایبان برای اولین بار، اپلیکیشن جامع خشکشویی های آنلاین را
              راهی بازار کرده است، اگر شما نیز قصد همکاری با ما را دارید کافی است از
              طریق راه های ارتباطی زیر تماس برقرار کنید.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;