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

import { useAuth } from "../../../context/AuthContext";
import { useAddresses } from "../../../hooks/useAddresses";
// ---------------- VALIDATION ----------------

const isValidCoords = (coords) =>
  coords &&
  typeof coords.lat === "number" &&
  typeof coords.lng === "number" &&
  !Number.isNaN(coords.lat) &&
  !Number.isNaN(coords.lng);

const DEFAULT_COORDS = { lat: 35.6892, lng: 51.389 };

const resolveInitialCoords = (initialPosition) => {
  if (isValidCoords(initialPosition)) {
    return { lat: initialPosition.lat, lng: initialPosition.lng };
  }
  return { ...DEFAULT_COORDS };
};

export default function MapSelector({
  initialPosition,
  initialAddress,
  onLocationSelect,
  goToNextStep,
}) {
  // ---------------- STATE ----------------

  const [coords, setCoords] = useState(() =>
    resolveInitialCoords(initialPosition)
  );

  const [address, setAddress] = useState(initialAddress || "");

  const [loadingAddress, setLoadingAddress] = useState(false);

  const [plaque, setPlaque] = useState("");
  const [unit, setUnit] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [open, setOpen] = useState(false);

  const historyLock = useRef(false);

  // ---------------- AUTH ----------------
// ✅ نگاشت عنوان آدرس به آیکون
const getAddressIcon = (title) => {
  const t = title?.trim() || "";
  if (t.includes("خانه") || t.includes("خونه") || t.toLowerCase().includes("home")) {
    return Home;
  }
  if (
    t.includes("کار") ||
    t.includes("دفتر") ||
    t.toLowerCase().includes("work") ||
    t.toLowerCase().includes("office")
  ) {
    return BriefcaseBusiness;
  }
  return MapPin;
};

// ✅ دیتای واقعی از API
const { addresses: savedAddresses, loading: addressesLoading } = useAddresses();

  const { isAuthenticated, loading: authLoading } = useAuth();



  // ---------------- SAFE SETCOORDS ----------------

  const safeSetCoords = useCallback((newCoords) => {
    if (isValidCoords(newCoords)) {
      setCoords({ lat: newCoords.lat, lng: newCoords.lng });
    } else {
      console.error("MapSelector: attempt to set invalid coords:", newCoords);
    }
  }, []);

  // ---------------- REVERSE GEOCODE ----------------

  const runReverseGeocode = useCallback(async (targetCoords, signal) => {
    if (!isValidCoords(targetCoords)) {
      console.error("runReverseGeocode: invalid targetCoords:", targetCoords);
      return;
    }

    try {
      setLoadingAddress(true);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/order/neshan/reverse/?lat=${targetCoords.lat}&lng=${targetCoords.lng}`,
        {
          signal,
          credentials: "include",
        },
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
  }, []);

  useEffect(() => {
    if (!isValidCoords(coords)) return;

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      runReverseGeocode(coords, controller.signal);
    }, 700);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [coords, runReverseGeocode]);

  // ---------------- CURRENT LOCATION ----------------

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("موقعیت جغرافیایی پشتیبانی نمی‌شود");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        if (isValidCoords(newCoords)) {
          safeSetCoords(newCoords);
          toast.success("موقعیت فعلی انتخاب شد");
        } else {
          console.error("handleCurrentLocation: geolocation returned invalid coords:", newCoords);
          toast.error("موقعیت دریافتی نامعتبر است");
        }
      },
      () => {
        toast.error("دسترسی به موقعیت مکانی رد شد");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }, [safeSetCoords]);

  // ---------------- SELECT SAVED ----------------

const handleSelectSaved = useCallback((item) => {
  const lat = parseFloat(item.latitude);
  const lng = parseFloat(item.longitude);
  const itemCoords = { lat, lng };

  if (!isValidCoords(itemCoords)) {
    console.error("handleSelectSaved: invalid coords:", itemCoords);
    toast.error("موقعیت مکانی این آدرس نامعتبر است");
    return;
  }

  safeSetCoords(itemCoords);
  setAddress(item.address_detail || "");
  setPlaque(item.apartment_name || "");
  setUnit(item.unit ? String(item.unit) : "");
  setTitle(item.title || "");
  setOpen(true);
}, [safeSetCoords]);

  // ---------------- SUBMIT ----------------

const handleSubmit = useCallback(
  ({ plaque, unit, title, description }) => {
    // ✅ آدرس اصلی بدون پلاک و واحد
    const cleanAddress = address?.split("، پلاک")[0]?.split("، واحد")[0]?.trim() || address;
    
    setPlaque(plaque);
    setUnit(unit);
    setTitle(title);
    setDescription(description || "");
    
    onLocationSelect({
      coords,
      address: cleanAddress,  
      plaque,               
      unit,                  
      title,
      description: description || "",
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
      dir="rtl"
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
          onPositionChange={safeSetCoords}
          onMarkerClick={() => {
            if (!isValidCoords(coords)) {
              console.error(
                "onMarkerClick: invalid coords:",
                coords
              );
              toast.error("موقعیت مکانی نامعتبر است");
              return;
            }
            setOpen(true);
          }}
        />
      </div>

      {/* LOCATION BUTTON */}
      <button
        onClick={handleCurrentLocation}
        className="
          absolute
          start-4
          bottom-70
          md:bottom-60 md:start-8
          z-[1000]
          p-0.5 md:p-1
          flex
          items-center
          justify-center
          md:w-12 w-10
          md:h-12 h-10
          active:scale-95
          transition
          bg-white/70
          rounded-full
        "
      >
        <LocateFixed
          size={42}
          className="text-sky-500 dark:text-[#262B40]"
        />
      </button>

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
              dark:bg-[#262B40]
              px-3
              py-2
            "
          >
            <MapPin
              size={16}
              className="text-sky-500 dark:text-[#8AA1C4] mt-1 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="text-xs text-right text-gray-500 dark:text-gray-400">
                آدرس انتخاب شده
              </p>

              <p className="text-sm text-right truncate text-gray-800 dark:text-gray-200">
                {loadingAddress
                  ? "در حال دریافت آدرس..."
                  : address}
              </p>
            </div>
          </div>

          {/* SEARCH */}
          <div className="pointer-events-auto mb-4">
            <SearchLocation
              onSelect={(loc) => {
                const newCoords = {
                  lat: loc.lat,
                  lng: loc.lng,
                };
                if (isValidCoords(newCoords)) {
                  safeSetCoords(newCoords);
                  setAddress(loc.address);
                } else {
                  console.error("SearchLocation onSelect: invalid coords:", newCoords);
                }
              }}
            />
          </div>

          {/* SAVED ADDRESSES */}
{/* SAVED ADDRESSES — REAL DATA */}
{isAuthenticated && (
  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
    {addressesLoading ? (
      <div className="text-xs text-gray-400 py-2">در حال بارگذاری آدرس‌ها...</div>
    ) : savedAddresses.length === 0 ? (
      <div className="text-xs text-gray-400 py-2">آدرسی ذخیره نشده</div>
    ) : (
      savedAddresses.map((item) => {
        const Icon = getAddressIcon(item.title);

        return (
          <button
            key={item.id}
            onClick={() => handleSelectSaved(item)}
            className="shrink-0 flex items-center gap-2 h-11 px-4 rounded-2xl bg-gray-100 dark:bg-[#262B40] border border-gray-200 dark:border-gray-600"
          >
            <Icon size={16} className="text-sky-500 dark:text-[#8AA1C4]" />
            <span className="text-xs font-bold text-right whitespace-nowrap text-gray-800 dark:text-gray-200">
              {item.title}
            </span>
          </button>
        );
      })
    )}
  </div>
)}
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