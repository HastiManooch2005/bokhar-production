import { useState, useEffect, useRef, useCallback, useMemo } from "react";

import { toast } from "react-hot-toast";

import {
  LocateFixed,
  Home,
  BriefcaseBusiness,
  MapPin,
  ChevronRight,
} from "lucide-react";

import MapView from "./MapView";
import SearchLocation from "./SearchLocation";
import AddressModal from "./AddressModal";


export default function MapSelector({
  initialPosition,
  initialAddress,
  onLocationSelect,
  goToNextStep,
}) {
  // ---------------- STATE ----------------

  const [coords, setCoords] = useState(
    initialPosition || {
      lat: 35.6892,
      lng: 51.389,
    },
  );

  const [address, setAddress] = useState(initialAddress || "");

  const [loadingAddress, setLoadingAddress] = useState(false);

  const [plaque, setPlaque] = useState("");
  const [unit, setUnit] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [open, setOpen] = useState(false);

  const historyLock = useRef(false);

  // ---------------- SAVED ADDRESSES ----------------

  const savedAddresses = useMemo(
    () => [
      {
        id: 1,
        title: "خانه",
        icon: Home,

        address: "تهران، آزادی",

        plaque: "12",
        unit: "3",

        coords: {
          lat: 35.6892,
          lng: 51.389,
        },
      },

      {
        id: 2,
        title: "محل کار",
        icon: BriefcaseBusiness,

        address: "تهران، ونک",

        plaque: "8",
        unit: "1",

        coords: {
          lat: 35.757,
          lng: 51.409,
        },
      },
    ],
    [],
  );

  // ---------------- REVERSE GEOCODE ----------------
useEffect(() => {
  if (!coords) return;

  const controller = new AbortController();

  const timeout = setTimeout(async () => {
    try {
      setLoadingAddress(true);

const res = await fetch(
  `${import.meta.env.VITE_API_URL}/order/neshan/reverse/?lat=${coords.lat}&lng=${coords.lng}`,
  {
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access")}`,
    },
  }
);
      if (!res.ok) {
        throw new Error("Reverse geocode failed");
      }

      const data = await res.json();

      setAddress(
        data.formatted_address ||
          data.route_name ||
          "آدرس پیدا نشد"
      );
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error(err);
      }
    } finally {
      setLoadingAddress(false);
    }
  }, 700);

  return () => {
    controller.abort();
    clearTimeout(timeout);
  };
}, [coords]);

  // ---------------- CURRENT LOCATION ----------------

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("موقعیت جغرافیایی پشتیبانی نمی‌شود");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });

        toast.success("موقعیت فعلی انتخاب شد");
      },

      () => {
        toast.error("دسترسی به موقعیت مکانی رد شد");
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }, []);

  // ---------------- SELECT SAVED ----------------

  const handleSelectSaved = useCallback((item) => {
    setCoords(item.coords);
    setAddress(item.address);
    setPlaque(item.plaque);
    setUnit(item.unit);
    setTitle(item.title);
    // با انتخاب آدرس ذخیره شده، مستقیماً مودال باز می‌شود (چون دکمه تایید حذف شده)
    setOpen(true);
  }, []);

  // ---------------- SUBMIT ----------------

  const handleSubmit = useCallback(
    ({ plaque, unit, title, description }) => {
      setPlaque(plaque);
      setUnit(unit);
      setTitle(title);
      setDescription(description);

      onLocationSelect({
        coords,
        address,
        plaque,
        unit,
        title,
        description,
      });

      setOpen(false);
      goToNextStep?.();
    },
    [coords, address, onLocationSelect, goToNextStep],
  );

  // ---------------- BACK BUTTON ----------------

  useEffect(() => {
    if (open && !historyLock.current) {
      window.history.pushState({ modal: true }, "");
      historyLock.current = true;
    }

    const onPopState = () => {
      if (open) {
        setOpen(false);
        historyLock.current = false;
      }
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [open]);

  // ---------------- RENDER ----------------

  return (
    <div
      className="
        fixed
        inset-0
  
        z-10
        pt-[145px]
        md:pt-[90px]

        pb-[88px]
        md:pb-0

        overflow-hidden

        bg-white
        dark:bg-[#1a1f2e]
      "
    >
      {/* MAP */}
      <div className="absolute inset-0">
<MapView
  position={coords}
  onPositionChange={setCoords}
  onMarkerClick={() => {
    onLocationSelect({
      coords,
      address,
    });

    goToNextStep?.();
  }}
/>
      </div>

      {/* TOP OVERLAY - حذف شد (سرچ به پایین منتقل شد) */}

      {/* LOCATION BUTTON */}
      <button
        onClick={handleCurrentLocation}
        className="
          absolute
          left-0
          bottom-[180px]
          md:bottom-[150px] md:left-4
          z-[1000]
          flex
          items-center
          justify-center
          w-14
          h-14
          active:scale-95
          transition
        "
      >
        <LocateFixed
          size={22}
          className="text-sky-500"
        />
      </button>

      {/* ⚠️ بخش آدرس‌های ذخیره شده خارج از باکس سفید حذف شد */}

      <div
        className="
          absolute
          bottom-[45px]
          md:bottom-0
          inset-x-0
          z-[1000]
        "
      >
        <div
          className="
            rounded-t-[32px]
            bg-white/95
            dark:bg-[#1a1f2e]/95
            backdrop-blur-2xl
            shadow-2xl
            p-4
          "
        >
          <div
  className="
    mb-3
    flex
    items-start
    gap-2
    rounded-xl
    bg-sky-50
    px-3
    py-2
  "
>
  <MapPin
    size={16}
    className="text-sky-500 mt-1 shrink-0"
  />

  <div className="min-w-0 flex-1">
    <p className="text-xs text-gray-500">
      آدرس انتخاب شده
    </p>

    <p className="text-sm truncate">
      {loadingAddress
        ? "در حال دریافت آدرس..."
        : address}
    </p>
  </div>
</div>
          {/* SEARCH - به داخل باکس سفید منتقل شد */}
          <div className="pointer-events-auto mb-4">
            <SearchLocation
              onSelect={(loc) => {
                setCoords({
                  lat: loc.lat,
                  lng: loc.lng,
                });
                setAddress(loc.address);
                // اگر می‌خواهید پس از جستجو هم مودال مستقیماً باز شود، خط زیر را فعال کنید:
                // setOpen(true);
              }}
            />
          </div>

          {/* SAVED ADDRESSES - فقط داخل باکس سفید */}
          <div
            className="
              flex
              gap-3
              overflow-x-auto
              pb-2
              no-scrollbar
            "
          >
            {savedAddresses.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectSaved(item)}
                  className="
                    shrink-0
                    flex
                    items-center
                    gap-2
                    h-11
                    px-4
                    rounded-2xl
                    bg-gray-100
                    dark:bg-[#262B40]
                    border
                    border-gray-200
                    dark:border-gray-600
                  "
                >
                  <Icon size={16} className="text-sky-500" />
                  <span className="text-xs font-bold whitespace-nowrap">
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* دکمه تایید مبدا حذف شد - انتخاب فقط از طریق کلیک روی مارکر یا آدرس ذخیره شده */}
        </div>
      </div>

      {/* MODAL */}
      <AddressModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        plaque={plaque}
        unit={unit}
        title={title}
        description={description}
        address={address}
      />
    </div>
  );
}