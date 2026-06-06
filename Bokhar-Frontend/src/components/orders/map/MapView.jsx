import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import {
  memo,
  useEffect,
  useRef,
  useState,
} from "react";

import { MapPin } from "lucide-react";

import "leaflet/dist/leaflet.css";

// ---------------- DARK MODE ----------------

function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(
        document.documentElement.classList.contains("dark")
      );
    };

    checkDark();

    const observer = new MutationObserver(checkDark);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

// ---------------- CHANGE CENTER ----------------

const ChangeCenter = memo(function ChangeCenter({
  position,
}) {
  const map = useMap();

  const prevPosition = useRef(position);

  useEffect(() => {
    if (!position) return;

    const prev = prevPosition.current;

    // جلوگیری از flyTo اضافه
    if (
      prev?.lat === position.lat &&
      prev?.lng === position.lng
    ) {
      return;
    }

    prevPosition.current = position;

    map.flyTo(position, map.getZoom(), {
      duration: 0.8,
      easeLinearity: 0.25,
    });
  }, [position, map]);

  return null;
});

// ---------------- MAP EVENTS ----------------

const MapEvents = memo(function MapEvents({
  onPositionChange,
}) {
  const timeoutRef = useRef(null);

  useMapEvents({
    move(e) {
      const map = e.target;

      const center = map.getCenter();

      // debounce برای performance بهتر
      clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        onPositionChange({
          lat: center.lat,
          lng: center.lng,
        });
      }, 80);
    },
  });

  return null;
});

// ---------------- MAIN ----------------

export default function MapView({
  position,
  onPositionChange,
  onMarkerClick,


}) {
  const isDark = useDarkMode();

  // ---------------- RENDER ----------------

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* MAP */}
      <MapContainer
        center={position}
        zoom={16}
        minZoom={5}
        maxZoom={19}

        
        zoomControl={false}

        scrollWheelZoom
        doubleClickZoom
        touchZoom
        dragging

        preferCanvas

        fadeAnimation
        zoomAnimation
        markerZoomAnimation

        className="
          h-full
          w-full
          z-0

          [&_.leaflet-control-container]:hidden
        "
      >
        <ChangeCenter position={position} />
<TileLayer
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  attribution="&copy; OpenStreetMap"
/>
        <MapEvents
          onPositionChange={onPositionChange}
        />
      </MapContainer>

      {/* CENTER SHADOW */}
      <div
        className="
        absolute
        left-1/2
        top-1/2

        z-[998]

        h-5
        w-5

        -translate-x-1/2

        rounded-full

        bg-black/20

        blur-md
      "
      />


{/* FIXED MARKER */}
<div
  onClick={onMarkerClick}
  className="
    absolute
    left-1/2
    top-1/2
    z-[999]

    -translate-x-1/2
    -translate-y-full

    cursor-pointer
  "
>
  <div
    className="
      absolute
      left-1/2
      top-[52px]

      -translate-x-1/2

      w-8
      h-3

      rounded-full

      bg-black/20

      blur-md
    "
  />

  <MapPin
  onClick={(e) => {
    e.stopPropagation();
    onMarkerClick?.();
  }}
  size={44}
  strokeWidth={1.2}
  className="
    text-sky-500
    cursor-pointer
    drop-shadow-[0_10px_20px_rgba(14,165,233,.4)]
  "
  fill="white"
/>
</div>

      {/* GRADIENT OVERLAY */}
      <div
        className="
        pointer-events-none

        absolute
        inset-x-0
        top-0

        h-24

        bg-gradient-to-b
        from-black/20
        to-transparent

        z-[997]
      "
      />

      {/* BOTTOM FADE */}
      <div
        className="
        pointer-events-none

        absolute
        inset-x-0
        bottom-0

        h-32

        bg-gradient-to-t
        from-black/20
        to-transparent

        z-[997]
      "
      />
    </div>
  );
}