import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";

import circle from "../../public/DryCleaning/circle.png";
import circle2 from "../../public/DryCleaning/circle2.png";
import circle3 from "../../public/DryCleaning/circle3.png";
import circle4 from "../../public/DryCleaning/circle4.png";
import drycleaning from "../../public/DryCleaning/drycleaning.png";
import dry2 from "../../public/DryCleaning/dry2.png";
import {
  FaInstagram,
  FaWhatsapp,
  FaLinkedinIn,
  FaGithub,
  FaXTwitter,
  FaEnvelope,
} from "react-icons/fa6";

export default function AboutDryCleanig() {
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
  const [showCollaboration, setShowCollaboration] = useState(false);

  const sectionRef = useRef(null);
  const navigate = useNavigate();
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
      },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);
  return (
    <div dir="rtl" className="w-full min-h-screen  overflow-x-hidden">
      <div className="relative w-full">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          aria-label="بازگشت"
          className="
            absolute top-4 left-4 z-50
            flex h-10 w-10 items-center justify-center
            rounded-full border border-gray-200
            bg-white/80 shadow-md transition
            hover:bg-gray-100
            dark:border-gray-700 dark:bg-gray-900/80 dark:hover:bg-gray-800
          "
        >
          <ArrowLeft size={20} className="text-gray-800 dark:text-gray-100" />
        </button>

        {/* Hero */}
        <div
          className="
            relative w-full overflow-hidden
            h-[230px]
            sm:h-[330px]
            md:h-[380px]
            lg:h-[500px]
            xl:h-[600px]
          "
        >
          {/* دایره آبی */}
          <img
            src={circle}
            alt="circle"
            className="
              absolute z-20 object-contain

              w-[70%] -top-10 -right-10

              min-[480px]:w-[74%]
              min-[480px]:-top-12
              min-[480px]:-right-8

              sm:w-[80%]
              sm:-top-58
              sm:-right-15

              min-[900px]:w-[76%]
              min-[900px]:-top-50
              min-[900px]:-right-10

              md:w-[72%]
              md:-top-54

              lg:w-[70%]
              lg:-top-67

              xl:w-[60%]
              xl:-top-66
            "
          />

          {/* circle3 */}
          <img
            src={circle3}
            alt="circle3"
            className="
              absolute z-30 object-contain

              w-[68%] -top-4 -right-12 h-50

              min-[480px]:w-[74%]
              min-[480px]:-right-16
              min-[480px]:top-0
              min-[480px]:h-60

              sm:w-full
              sm:-right-45
              sm:-top-28
              sm:h-90

              min-[900px]:-right-40
              min-[900px]:-top-30
              min-[900px]:h-100

              md:-right-48
              md:-top-40
              md:h-120

              lg:-right-70
              lg:-top-34
              lg:h-140

              xl:-right-100
              xl:-top-50
              xl:h-180
            "
          />

          {/* circle2 */}
          <img
            src={circle2}
            alt="circle2"
            className="
              absolute z-10 object-contain

              w-[150%] -left-26 -top-38

              min-[480px]:w-[148%]
              min-[480px]:-left-30
              min-[480px]:-top-50

              sm:w-[145%]
              sm:-left-44
              sm:-top-90

              min-[900px]:w-[148%]
              min-[900px]:-left-48
              min-[900px]:-top-100

              md:w-[150%]
              md:-left-52
              md:-top-110

              lg:w-[150%]
              lg:-left-54
              lg:-top-145

              xl:w-full
              xl:-left-90
              xl:-top-175
              xl:h-310
            "
          />
        </div>

        {/* Boxes */}
        <div className="mt-2 md:mt-4 flex flex-col items-center px-4 pb-10 sm:pb-20">
          {/* Box 1 */}
          <div
            className="
              w-[80%] sm:w-[70%] lg:w-full max-w-[520px]
              self-end sm:mr-30 lg:ml-10 xl:ml-40

              rounded-full
              bg-[#2949A9]
              px-2 py-3
              sm:px-3 sm:py-4
              lg:px-6 lg:py-5
              text-white
              shadow-2xl
            "
          >
            <h2 className="text-xl text-center font-bold sm:text-2xl">
              درباره خشکشویی
            </h2>
          </div>

          {/* Box 2 */}
          <div
            className="
              w-[100%] sm:w-[80%] max-w-[800px]
              rounded-full 
              border border-gray-200
              bg-[#E8F5FC]
              p-4 
              lg:px-6 lg:py-6
              text-center
              shadow-xl
              dark:border-gray-700
              dark:bg-gray-900
            "
          >
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#133489] dark:text-white whitespace-nowrap">
              خدمات خشکشویی افشار
            </h2>
          </div>
        </div>
        {/* Text Under Boxes */}
        <div className="mt-2 sm:mt-8 px-4 text-center">
          <p
            className="
      text-lg
      sm:text-2xl
      lg:text-3xl
      font-bold
      leading-relaxed
      text-black
    "
          >
            ۱۰ سال تجربه، از شستن معمولی تا لباس های حساس
          </p>
        </div>
        {/* Section */}
        <div
          className="
    relative w-full
    flex justify-center
    px-4
    py-5
    sm:py-14
    lg:py-10
    mt-1 sm:mt-4 
    mb-20
  "
        >
          {/* صورتی */}
          <div
            className="
      absolute

      w-[80%]
      sm:w-[72%]
      lg:w-[50%]

      h-[85%]

      rounded-[28px]
      sm:rounded-[36px]
      lg:rounded-[42px]

      bg-[#B6ABDA]

      -translate-x-5
      translate-y-4

      sm:-translate-x-6
      sm:translate-y-6

      lg:-translate-x-10
      lg:translate-y-10
    "
          />

          {/* آبی */}
          <div
            className="
      relative z-10

      w-[88%]
      sm:w-[72%]
      lg:w-[50%]

      overflow-visible
      rounded-[28px]
      sm:rounded-[36px]
      lg:rounded-[42px]

      bg-[#133489]
      shadow-2xl
    "
          >
            <div
              className="
        flex justify-center

        p-4
        sm:p-6
        md:p-8
        lg:p-10
      "
            >
              <img
                src={drycleaning}
                alt="drycleaning"
                className="
          w-full
          max-w-[900px]
          object-contain
          rounded-[20px]
          sm:rounded-[28px]
          lg:rounded-[32px]
        "
              />
            </div>

            {/* دایره */}
            <div
              className="
        absolute
        bottom-[-130px]
        right-[-10px]

        sm:bottom-[-160px]
        sm:right-[-20px]

        lg:bottom-[-220px]
        lg:right-[-30px]

        w-44 h-44
        sm:w-62 sm:h-62
        lg:w-84 lg:h-84

        rounded-full
        bg-[#CFD8F2]

        flex items-center justify-center
        shadow-xl
      "
            >
              <img
                src={dry2}
                alt="dry2"
                className="
          w-[90%]
          object-contain
        "
              />
            </div>
          </div>
        </div>
        {/* متن درباره خشکشویی */}
        <div className="relative w-full px-4 mt-30 lg:mt-50 mb-4 ">
          {/* circle4 */}
<img
  src={circle4}
  alt="circle4"
  className="
    absolute
    top-[320px]
    left-0

    w-[70vw]
    max-w-[700px]

    -translate-x-[15%]

    object-contain
    z-0
    pointer-events-none
  "
/>

          {/* باکس سفید */}
          <div className="relative z-10 w-full flex justify-center">
            <div
              className="
        w-[92%]
        sm:w-[85%]
        lg:w-[70%]
        xl:w-[60%]

        rounded-[28px]
        sm:rounded-[36px]

        bg-[#E8F5FC]
        shadow-xl

        px-5 py-6
        sm:px-8 sm:py-8
        lg:px-12 lg:py-10
      "
            >
              <p
                className="
          text-right
          text-[15px]
          sm:text-lg
          lg:text-xl

          leading-[2.2]
          sm:leading-[2.5]

          font-medium
          text-[#133489]
        "
              >
                ۱۰ سال پیش از یک مغازه کوچک شروع کردیم. ۸ سال است که علاوه بر
                پذیرش حضوری، آنلاین و تلفنی هم در خدمتیم.
                <br />
                <br />
                شعار ما همیشه این بوده:
                <span className="font-bold">
                  {" "}
                  کار ما تبلیغ نیست، تبلیغ ما کار ماست.
                </span>
                <br />
                <br />
                امروز به یکی از بهترین خشکشویی‌های هشتگرد تبدیل شده‌ایم، بدون
                آنکه حتی یک روز ادعای بی‌عمل داشته باشیم.
              </p>
            </div>
          </div>

          {/* دو باکس خدمات */}
          <div
            className="
      relative z-20

      w-full
      flex justify-center
    
      mt-7

    "
          >
            <div
              className="
    w-full
    max-w-[1200px]

    flex flex-col
    sm:flex-row

    gap-4
    sm:gap-5
    lg:gap-8

    items-stretch
    justify-center
  "
            >
              {/* باکس اول */}
              <div
                className="
          flex-1

          rounded-[28px]
          sm:rounded-[36px]

          bg-[#0B1D4B]
          shadow-2xl

          px-5 py-6
          sm:px-8 sm:py-8
          lg:px-10 lg:py-10
        "
              >
                <h3
                  className="
            text-white
            text-lg
            sm:text-xl
            lg:text-2xl
            font-bold
            mb-5
          "
                >
                  ویژگی خدمات
                </h3>

                <ul
                  className="
            space-y-4

            text-white
            text-[15px]
            sm:text-lg
            lg:text-xl

            leading-[2]
          "
                >
                  <li>• استفاده از مواد شوینده ضد حساسیت.</li>

                  <li>• گارانتی کیفیت شستشو.</li>

                  <li>• نظافت دستی لباسهای حساس ابریشمی.</li>

                  <li>• استفاده از بهترین برندهای مواد شوینده.</li>
                </ul>
              </div>

              {/* باکس دوم */}
              <div
                className="
          flex-1

          rounded-[28px]
          sm:rounded-[36px]

          bg-[#0B1D4B]
          shadow-2xl

          px-5 py-6
          sm:px-8 sm:py-8
          lg:px-10 lg:py-10

          flex items-center
        "
              >
                <p
                  className="
            text-white

            text-[15px]
            sm:text-lg
            lg:text-xl

            leading-[2.3]
            font-medium
          "
                >
                  ما لباس عروس، کت و شلوار و البسه روزمره شما را با مسئولیت کامل
                  تحویل می‌گیریم. قبل از شستشو، جنس و رنگ لباس را بررسی می‌کنیم.
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* بخش شبکه‌های اجتماعی - با انیمیشن اسکرول */}
        <div
          ref={sectionRef}
          className="w-full flex flex-col justify-center relative overflow-hidden mt-8 sm:mt-24"
        >
          <div className="flex flex-col-reverse w-full ">
            {/* باکس پایینی (در نمایش): راه‌های ارتباط - z-index بالاتر */}
            <div
              className="w-full bg-sky-50 justify-center rounded-t-4xl shadow-md border border-gray-100
                       px-4 sm:px-8 py-6 sm:py-10 relative z-20"
            >
              <h3 className="text-gray-800 text-center text-lg sm:text-xl md:text-2xl font-bold mb-6">
                شبکه های اجتماعی خشکشویی افشار:{" "}
              </h3>

              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-5 justify-items-center pb-12 md:pb-0">
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
  className={`
    flex flex-col mx-6 sm:mx-12 md:mx-20
    bg-white justify-center items-center gap-1
    px-2 sm:px-8 py-2 sm:py-9
    rounded-t-4xl shadow-sm border border-gray-100
    relative z-10
    transition-all duration-1000 ease-out transform

    ${
      showCollaboration
        ? "translate-y-0 opacity-100"
        : "translate-y-20 opacity-0"
    }
  `}
>
              <h2 className="text-gray-800 text-center text-base sm:text-lg md:text-xl font-bold">
                راه های ارتباطی با خشکشویی:{" "}
              </h2>
              <span className="p-4 text-center text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed max-w-3xl">
                مراجعه حضوری: کرج، گوهردشت، شهرک ولیعصر، خ آزادگان، نبش خیابان
                شهید خرازی
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
