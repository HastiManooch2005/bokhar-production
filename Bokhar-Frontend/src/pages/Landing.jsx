import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { CalendarDaysIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { IoShirtSharp } from "react-icons/io5";
import { MdOutlineIron } from "react-icons/md";
import { GiWashingMachine } from "react-icons/gi";
import { LuWashingMachine } from "react-icons/lu";

import bubble7 from "../assets/bubble7.png";
import bubble11 from "../assets/bubble11.png";
import bubble12 from "../assets/bubble12.png";
import bubble13 from "../assets/bubble13.png";
import bubble14 from "../assets/bubble14.png";
import bubble15 from "../assets/bubble15.png";
import iron1 from "../assets/iron1.png";
import iron2 from "../assets/iron2.png";
import Group from "../assets/Group.png";
import Group2 from "../assets/Group2.png";

export default function Landing() {
  const { scrollY } = useScroll();
  const navigate = useNavigate();
  const aboutRef = useRef(null);

  // تشخیص موبایل
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const secondSectionRef = useRef(null);
  const { scrollYProgress: secondProgress } = useScroll({
    target: secondSectionRef,
    offset: ["start end", "end start"],
  });

  const bubbles = [
    // ردیف اول - بالا
    {
      img: bubble11,
      y: useTransform(scrollY, [0, 1000], [0, 150]),
      x: useTransform(scrollY, [0, 1000], [0, 80]),
      rotate: useTransform(scrollY, [0, 1000], [0, 120]),
      className: "top-[5%] left-[10%] w-16 sm:w-20 md:w-24 opacity-70",
    },
    {
      img: bubble12,
      y: useTransform(scrollY, [0, 1000], [0, -120]),
      x: useTransform(scrollY, [0, 1000], [0, -60]),
      rotate: useTransform(scrollY, [0, 1000], [0, -150]),
      className: "top-[8%] right-[15%] w-20 sm:w-24 md:w-28 opacity-60",
    },
    {
      img: bubble13,
      y: useTransform(scrollY, [0, 1000], [0, 100]),
      x: useTransform(scrollY, [0, 1000], [0, -100]),
      rotate: useTransform(scrollY, [0, 1000], [0, 200]),
      className: "top-[15%] left-[40%] w-14 sm:w-16 md:w-20 opacity-50",
    },
    // ردیف دوم - بالای متوسط
    {
      img: bubble14,
      y: useTransform(scrollY, [0, 1000], [0, -180]),
      x: useTransform(scrollY, [0, 1000], [0, 120]),
      rotate: useTransform(scrollY, [0, 1000], [0, 250]),
      className: "top-[25%] right-[5%] w-16 sm:w-20 md:w-24 opacity-60",
    },
    {
      img: bubble15,
      y: useTransform(scrollY, [0, 1000], [0, 200]),
      x: useTransform(scrollY, [0, 1000], [0, -80]),
      rotate: useTransform(scrollY, [0, 1000], [0, -180]),
      className: "top-[30%] left-[5%] w-18 sm:w-22 md:w-26 opacity-55",
    },
    {
      img: bubble7,
      y: useTransform(scrollY, [0, 1000], [0, -150]),
      x: useTransform(scrollY, [0, 1000], [0, 60]),
      rotate: useTransform(scrollY, [0, 1000], [0, 300]),
      className: "top-[35%] right-[35%] w-20 sm:w-24 md:w-28 opacity-50",
    },
    // ردیف سوم - وسط صفحه
    {
      img: bubble11,
      y: useTransform(scrollY, [0, 1000], [0, 120]),
      x: useTransform(scrollY, [0, 1000], [0, -120]),
      rotate: useTransform(scrollY, [0, 1000], [0, -200]),
      className: "top-[45%] left-[20%] w-16 sm:w-20 md:w-24 opacity-65",
    },
    {
      img: bubble12,
      y: useTransform(scrollY, [0, 1000], [0, -100]),
      x: useTransform(scrollY, [0, 1000], [0, 100]),
      rotate: useTransform(scrollY, [0, 1000], [0, 150]),
      className: "top-[50%] right-[25%] w-14 sm:w-18 md:w-22 opacity-50",
    },
    {
      img: bubble13,
      y: useTransform(scrollY, [0, 1000], [0, 180]),
      x: useTransform(scrollY, [0, 1000], [0, 40]),
      rotate: useTransform(scrollY, [0, 1000], [0, -250]),
      className: "top-[55%] left-[50%] w-12 sm:w-16 md:w-20 opacity-45",
    },
    // ردیف چهارم - پایین
    {
      img: bubble14,
      y: useTransform(scrollY, [0, 1000], [0, -200]),
      x: useTransform(scrollY, [0, 1000], [0, -60]),
      rotate: useTransform(scrollY, [0, 1000], [0, 280]),
      className: "top-[65%] right-[10%] w-16 sm:w-20 md:w-24 opacity-60",
    },
    {
      img: bubble15,
      y: useTransform(scrollY, [0, 1000], [0, 150]),
      x: useTransform(scrollY, [0, 1000], [0, 100]),
      rotate: useTransform(scrollY, [0, 1000], [0, -120]),
      className: "top-[70%] left-[8%] w-20 sm:w-24 md:w-28 opacity-55",
    },
    {
      img: bubble7,
      y: useTransform(scrollY, [0, 1000], [0, -120]),
      x: useTransform(scrollY, [0, 1000], [0, -100]),
      rotate: useTransform(scrollY, [0, 1000], [0, 200]),
      className: "top-[75%] right-[40%] w-18 sm:w-22 md:w-26 opacity-50",
    },
    // ردیف پنجم - ته صفحه
    {
      img: bubble11,
      y: useTransform(scrollY, [0, 1000], [0, 100]),
      x: useTransform(scrollY, [0, 1000], [0, -40]),
      rotate: useTransform(scrollY, [0, 1000], [0, 180]),
      className: "top-[85%] left-[30%] w-14 sm:w-18 md:w-22 opacity-60",
    },
    {
      img: bubble12,
      y: useTransform(scrollY, [0, 1000], [0, -150]),
      x: useTransform(scrollY, [0, 1000], [0, 80]),
      rotate: useTransform(scrollY, [0, 1000], [0, -300]),
      className: "top-[90%] right-[20%] w-16 sm:w-20 md:w-24 opacity-55",
    },
    {
      img: bubble13,
      y: useTransform(scrollY, [0, 1000], [0, 200]),
      x: useTransform(scrollY, [0, 1000], [0, -60]),
      rotate: useTransform(scrollY, [0, 1000], [0, 250]),
      className: "top-[95%] left-[60%] w-12 sm:w-16 md:w-20 opacity-40",
    },
  ];

  const { scrollYProgress } = useScroll({
    target: aboutRef,
    offset: ["start end", "end start"],
  });

  // هدرها
  const h1X = useTransform(scrollYProgress, [0.1, 0.25], [-80, 0]);
  const h1Opacity = useTransform(scrollYProgress, [0.1, 0.25], [0, 1]);

  const h2X = useTransform(scrollYProgress, [0.25, 0.4], [-80, 0]);
  const h2Opacity = useTransform(scrollYProgress, [0.25, 0.4], [0, 1]);

  const h3X = useTransform(scrollYProgress, [0.4, 0.55], [-80, 0]);
  const h3Opacity = useTransform(scrollYProgress, [0.4, 0.55], [0, 1]);

  // عکس درباره ما با breakpoint موبایل
  const imgX = useTransform(
    scrollYProgress,
    isMobile ? [0, 0.35] : [0.15, 0.4],
    isMobile ? [40, 0] : [80, 0],
  );
  const imgOpacity = useTransform(
    scrollYProgress,
    isMobile ? [0.1, 0.5] : [0.2, 0.6],
    [0, 1],
  );
  return (
    <div className="relative min-h-[200vh] bg-gradient-to-br from-pink-50 to-blue-50 overflow-hidden">
      {/* حباب‌ها */}
      {bubbles.map((bubble, index) => (
        <motion.img
          key={index}
          src={bubble.img}
          style={{ y: bubble.y, x: bubble.x, rotate: bubble.rotate }}
          className={`absolute pointer-events-none ${bubble.className}`}
          alt=""
        />
      ))}

      <div className="flex items-start justify-between px-4 sm:px-6 md:px-10 mt-0 flex-nowrap">
        <div className="flex gap-3 sm:gap-6 flex-shrink-0 z-50 mt-0">
          <img
            src={iron2}
            alt="iron"
            className="w-20 sm:w-28 md:w-36 lg:w-44 xl:w-52 h-[100%] sm:h-[250px] md:h-[300px] lg:h-[350px] xl:h-[400px] max-w-full object-contain object-top"
          />
          <img
            src={iron1}
            alt="iron"
            className="w-20 sm:w-28 md:w-36 lg:w-44 xl:w-52 h-[100%] sm:h-[220px] md:h-[270px] lg:h-[320px] xl:h-[380px] max-w-full object-contain object-top"
          />
        </div>

        <h1
          className="font-extrabold text-gray-800 mt-16 sm:mt-20 md:mt-24 md:mr-10 ml-4 z-10 flex-shrink whitespace-nowrap"
          style={{ fontSize: "clamp(1.3rem, 5vw, 3rem)" }}
        >
          خشکشویی افشار
        </h1>
      </div>

      
<div className="flex flex-col items-end gap-3 pr-6 sm:pr-10 md:pr-20 mt-5 sm:mt-0 relative z-10">
  {/* دکمه اصلی */}
  <button
    onClick={() => navigate("/shop")}
    className="px-10 py-3 sm:px-14 sm:py-6 md:px-18 md:py-7 rounded-full bg-purple-50 text-[#202374] text-md sm:text-lg md:text-2xl font-semibold hover:bg-white transition duration-300 shadow-lg cursor-pointer"
  >
    ثبت سفارش
  </button>

  {/* ردیف دکمه‌های فرعی */}
  <div className="flex flex-row mt-4 gap-2 sm:gap-3 w-full justify-end">
    <button
      onClick={() => navigate("/aboutDryCleaning")}
      className="px-6 py-3 sm:px-12 sm:py-5 md:px-16 md:py-6 rounded-full bg-[#D2D9ED] hover:bg-[#e5e8f0] text-[#6B7EB7] font-semibold border border-[#2949A9] transition duration-300 shadow-md text-sm sm:text-base whitespace-nowrap"
    >
      درباره خشکشویی
    </button>
    <button
      onClick={() => navigate("/aboutUs")}
      className="px-6 py-3 sm:px-12 sm:py-5 md:px-16 md:py-6 rounded-full bg-[#D2D9ED] hover:bg-[#e5e8f0] text-[#6B7EB7] font-semibold border border-[#2949A9] transition duration-300 shadow-md text-sm sm:text-base whitespace-nowrap"
    >
      درباره ما
    </button>
  </div>
</div>


      <div ref={aboutRef} className="relative z-10 mt-20 px-4 sm:px-6 md:px-20">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-10">
          <motion.div
            className="
    w-32 sm:w-32 md:mt-10
    md:w-48 lg:w-64 xl:w-72
    flex-shrink-0
    md:order-2
    flex flex-col items-center
  "
            style={{ x: imgX, opacity: imgOpacity }}
          >
            {/* هدر بالای عکس */}
            <h2 className="text-lg font-bold mb-2 text-center">
              شستشو و تا کردن
            </h2>

            {/* عکس */}
            <img
              src={Group}
              alt=""
              className="w-full bg-amber-50 p-3 sm:p-4 rounded-3xl shadow-xl object-contain"
            />

            {/* متن پایین عکس */}
            <p className="mt-2 text-center text-sm text-gray-600">
              مراقبت آسان از لباس‌ها، طراحی شده برای زندگی‌های پرمشغله.{" "}
            </p>
          </motion.div>

          <div
            dir="rtl"
            className="flex-1 min-w-0 text-right space-y-8 md:order-1"
          >
            <motion.div style={{ x: h1X, opacity: h1Opacity }}>
              <div className="flex items-start gap-3">
                <CalendarDaysIcon className="w-6 h-6 sm:w-7 sm:h-7 text-gray-800 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">
                    زمان بندی شخصی
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg text-gray-600 mt-2 leading-relaxed">
                    شما می‌توانید هر روز هفته برای تحویل لباس وقت تعیین کنید.
                    متصدی شما بین ساعت ۷ تا ۱۰ شب با کیسه‌های شستشوی رایگان و
                    شخصی شما خواهد آمد.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div style={{ x: h2X, opacity: h2Opacity }}>
              <div className="flex items-start gap-3">
                <ShieldCheckIcon className="w-6 h-6 sm:w-7 sm:h-7 text-gray-800 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">
                    مراقبت‌های حرفه‌ای
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg text-gray-600 mt-2 leading-relaxed">
                    لباس‌های روشن و تیره از هم جدا شده و با آب سرد شسته می‌شوند.
                    مواد شوینده و نرم‌کننده پارچه ضد حساسیت بنا به درخواست
                    رایگان ارائه می‌شود.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div style={{ x: h3X, opacity: h3Opacity }}>
              <div className="flex items-start gap-3">
                <IoShirtSharp className="w-6 h-6 sm:w-7 sm:h-7 text-gray-800 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">
                    آماده برای پوشیدن
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg text-gray-600 mt-2 leading-relaxed">
                    لباس‌های شما درب منزل تحویل داده می‌شوند، کاملاً تا شده‌اند
                    و جوراب‌هایتان جفت شده‌اند، آماده برای پوشیدن یا قرار دادن
                    در کشوها.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div
        ref={secondSectionRef}
        className="relative z-10 my-20 px-4 sm:px-6 md:px-20 pb-5 md:pb-10"
      >
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-10">
          {/* عکس سمت چپ */}
          <motion.div
            className="w-32 sm:w-32 md:w-48 lg:w-64 xl:w-72 flex-shrink-0 flex flex-col items-center md:order-1"
            style={{
              x: useTransform(secondProgress, [0.0, 0.3], [-80, 0]),
              opacity: useTransform(secondProgress, [0.0, 0.3], [0, 1]),
            }}
          >
            <h2 className="text-lg font-bold mb-2 text-center">خشکشویی سریع</h2>
            <img
              src={Group2}
              alt="خدمات خشکشویی"
              className="w-full bg-amber-50 p-3 sm:p-4 rounded-3xl shadow-xl object-contain"
            />
            <p className="mt-2 text-center text-sm text-gray-600">
              تحویل و دریافت آسان برای صرفه‌جویی در وقت شما. نظافت با کیفیت بالا
              برای حفظ بهترین ظاهر شما.{" "}
            </p>
          </motion.div>

          {/* متن‌ها سمت راست */}
          <div
            dir="rtl"
            className="flex-1 min-w-0 text-right space-y-8 md:order-2"
          >
            <motion.div
              style={{
                x: useTransform(secondProgress, [0.1, 0.4], [80, 0]),
                opacity: useTransform(secondProgress, [0.1, 0.4], [0, 1]),
              }}
            >
              <h2 className="flex items-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">
                <GiWashingMachine  className="w-6 h-6 sm:w-7 sm:h-7 text-gray-800 flex-shrink-0 mt-1" />
                تمیز کردن و لکه‌بری تخصصی
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 mt-2 leading-relaxed">
                ما به دقت برچسب مراقبت را دنبال می‌کنیم و لباس‌های شما را از نظر
                لکه بررسی می‌کنیم تا مطمئن شویم که بهترین روش برای لکه‌بری روی
                آنها اعمال می‌شود.
              </p>
            </motion.div>

            <motion.div
              style={{
                x: useTransform(secondProgress, [0.3, 0.5], [80, 0]),
                opacity: useTransform(secondProgress, [0.3, 0.6], [0, 1]),
              }}
            >
              <h2 className="flex items-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">
                <MdOutlineIron  className="w-6 h-6 sm:w-7 sm:h-7 text-gray-800 flex-shrink-0 mt-1" />
                اتو شده و روی چوب‌لباسی برگردانده می‌شوند
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 mt-2 leading-relaxed">
                لباس‌های شما پس از اتو شدن، روی چوب‌لباسی قرار داده شده، در
                کیسه‌های محافظ لباس قرار داده شده و آماده پوشیدن، درب منزل شما
                تحویل داده می‌شوند.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* فوتر مینیمال با رنگ برند */}
<footer className="relative w-full mt-20 text-white">
  {/* موج بالای فوتر */}
  <div className="absolute  bottom-0 w-full overflow-hidden leading-none ">
    <svg
      className="relative block w-full h-24 md:h-40" // ارتفاع موج بزرگ شد
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
    >
      <path
        fill="#6B7EB7"
        fillOpacity="1"
        d="M0,160L48,138.7C96,117,192,75,288,74.7C384,75,480,117,576,117.3C672,117,768,75,864,74.7C960,75,1056,117,1152,138.7C1248,160,1344,160,1392,160L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
      ></path>
    </svg>
  </div>

  {/* محتوای فوتر */}
  <div className="relative z-10 py-6 md:py-10 text-center  rounded-t-4xl">
    ساخته شده توسط تیم رایبان
  </div>
</footer>
    </div>
  );
}
