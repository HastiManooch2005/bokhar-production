import { useState, useEffect, useRef, useCallback } from "react";

import { toast } from "react-hot-toast";

import {
  LocateFixed,
  Home,
  BriefcaseBusiness,
  MapPin,
  Settings,
} from "lucide-react";

import MapView from "./MapView";
import SearchLocation from "./SearchLocation";
import AddressModal from "./AddressModal";
import SavedAddressesPage from "./SavedAddressesPage";
import ReplaceAddressModal from "./ReplaceAddressModal";

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

  // ویو داخلی: 'map' | 'saved'
  const [view, setView] = useState("map");

  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [pendingAddress, setPendingAddress] = useState(null);
  const [leastUsedToReplace, setLeastUsedToReplace] = useState(null);

  // ---------------- AUTH & ADDRESSES ----------------

  const { isAuthenticated } = useAuth();

  const {
    addresses: savedAddresses,
    loading: addressesLoading,
    createAddress,
    updateAddress,
    deleteAddress,
    getLeastUsed,
  } = useAddresses();

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
        { signal, credentials: "include" }
      );
      if (!res.ok) throw new Error("Reverse geocode failed");
      const data = await res.json();
      setAddress(data.formatted_address || data.route_name || "آدرس پیدا نشد");
    } catch (err) {
      if (err.name !== "AbortError") console.error(err);
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
          toast.error("موقعیت دریافتی نامعتبر است");
        }
      },
      () => toast.error("دسترسی به موقعیت مکانی رد شد"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [safeSetCoords]);

  // ---------------- SELECT SAVED ----------------

  const handleSelectSaved = useCallback((item) => {
    const lat = parseFloat(item.latitude);
    const lng = parseFloat(item.longitude);
    const itemCoords = { lat, lng };

    if (!isValidCoords(itemCoords)) {
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

  // ---------------- SAVE / REPLACE LOGIC ----------------

  const saveAddressToApi = async (data) => {
    return await createAddress({
      title: data.title || "آدرس جدید",
      address_detail: data.address,
      apartment_name: data.plaque,
      unit: parseInt(data.unit) || 1,
      latitude: data.coords.lat,
      longitude: data.coords.lng,
      province: "تهران",
      city: "تهران",
      description: data.description,
    });
  };

  const handleSubmit = useCallback(
    ({ plaque, unit, title, description }) => {
      const cleanAddress =
        address?.split("، پلاک")[0]?.split("، واحد")[0]?.trim() || address;

      const payload = {
        coords,
        address: cleanAddress,
        plaque,
        unit,
        title,
        description: description || "",
      };

      setPlaque(plaque);
      setUnit(unit);
      setTitle(title);
      setDescription(description || "");

      // چک کردن محدودیت ۱۰ آدرس
      if (isAuthenticated && savedAddresses.length >= 10) {
        const leastUsed = getLeastUsed();
        setLeastUsedToReplace(leastUsed);
        setPendingAddress(payload);
        setShowReplaceModal(true);
        setOpen(false);
        return;
      }

      // مستقیم سیو و ادامه
      if (isAuthenticated) {
        saveAddressToApi(payload);
      }

      onLocationSelect(payload);
      setOpen(false);
      goToNextStep?.();
    },
    [coords, address, onLocationSelect, goToNextStep, isAuthenticated, savedAddresses.length, getLeastUsed]
  );

  const handleConfirmReplace = async () => {
    if (!leastUsedToReplace || !pendingAddress) return;

    await deleteAddress(leastUsedToReplace.id);
    await saveAddressToApi(pendingAddress);

    onLocationSelect(pendingAddress);
    goToNextStep?.();

    setShowReplaceModal(false);
    setPendingAddress(null);
    setLeastUsedToReplace(null);
  };

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
    return () => window.removeEventListener("popstate", onPopState);
  }, [open]);

  // ---------------- RENDER ----------------

  return (
    <>
      <div
        dir="rtl"
        className={`fixed inset-0 z-10 pt-[145px] md:pt-[90px] pb-[88px] md:pb-0 overflow-hidden bg-white dark:bg-[#1a1f2e] ${
          view === "saved" ? "hidden" : ""
        }`}
      >
        {/* MAP */}
        <div className="absolute inset-0">
          <MapView
            position={coords}
            onPositionChange={safeSetCoords}
            onMarkerClick={() => {
              if (!isValidCoords(coords)) {
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
          className="absolute start-4 bottom-70 md:bottom-60 md:start-8 z-[1000] p-0.5 md:p-1 flex items-center justify-center md:w-12 w-10 md:h-12 h-10 active:scale-95 transition bg-white/70 rounded-full"
        >
          <LocateFixed size={42} className="text-sky-500 dark:text-[#262B40]" />
        </button>

        {/* BOTTOM PANEL */}
        <div className="absolute bottom-[45px] md:bottom-0 inset-x-0 z-[1000]">
          <div className="rounded-t-[32px] bg-white/95 dark:bg-[#1a1f2e]/95 backdrop-blur-2xl shadow-2xl p-4">
            {/* ADDRESS INFO */}
            <div className="mb-3 flex items-start gap-2 rounded-xl bg-sky-50 dark:bg-[#262B40] px-3 py-2">
              <MapPin size={16} className="text-sky-500 dark:text-[#8AA1C4] mt-1 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-right text-gray-500 dark:text-gray-400">آدرس انتخاب شده</p>
                <p className="text-sm text-right truncate text-gray-800 dark:text-gray-200">
                  {loadingAddress ? "در حال دریافت آدرس..." : address}
                </p>
              </div>
            </div>

            {/* SEARCH + SETTINGS — ردیف هم */}
            <div className="pointer-events-auto mb-4 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <SearchLocation
                  onSelect={(loc) => {
                    const newCoords = { lat: loc.lat, lng: loc.lng };
                    if (isValidCoords(newCoords)) {
                      safeSetCoords(newCoords);
                      setAddress(loc.address);
                    }
                  }}
                />
              </div>
              {isAuthenticated && (
                <button
                  onClick={() => setView("saved")}
                  className="shrink-0 flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-gray-100 dark:bg-[#262B40] border border-gray-200 dark:border-gray-600 active:scale-95 transition"
                  title="آدرس‌های ذخیره شده"
                >
                  <Settings size={20} className="text-gray-600 dark:text-[#8AA1C4]" />
                </button>
              )}
            </div>

            {/* SAVED ADDRESSES */}
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

        {/* ADDRESS MODAL */}
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

        {/* REPLACE ADDRESS MODAL */}
        <ReplaceAddressModal
          isOpen={showReplaceModal}
          onClose={() => {
            setShowReplaceModal(false);
            setPendingAddress(null);
            setLeastUsedToReplace(null);
          }}
          onConfirm={handleConfirmReplace}
          leastUsedAddress={leastUsedToReplace}
        />
      </div>

      {/* SAVED ADDRESSES PAGE — full screen */}
      {view === "saved" && (
        <SavedAddressesPage
          addresses={savedAddresses}
          onBack={() => setView("map")}
          onDelete={deleteAddress}
          onUpdate={updateAddress}
          onSelect={(item) => {
            handleSelectSaved(item);
            setView("map");
          }}
        />
      )}
    </>
  );
}