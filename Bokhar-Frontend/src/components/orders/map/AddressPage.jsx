import { useState } from "react";
import MapSelector from "./MapSelector";
import SavedAddressesModal from "./SavedAddressesModal";
import ReplaceAddressModal from "./ReplaceAddressModal";
import { useAddresses } from "../hooks/useAddresses";

export default function AddressPage() {
  const {
    addresses,
    createAddress,
    updateAddress,
    deleteAddress,
    incrementUsage,
    getLeastUsed,
  } = useAddresses();

  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [pendingAddress, setPendingAddress] = useState(null);
  const [leastUsedToReplace, setLeastUsedToReplace] = useState(null);

  const handleLocationSelect = async (data) => {
    if (addresses.length >= 10) {
      const leastUsed = getLeastUsed();
      setLeastUsedToReplace(leastUsed);
      setPendingAddress(data);
      setShowReplaceModal(true);
      return;
    }

    await saveAddress(data);
  };

  const saveAddress = async (data) => {
    await createAddress({
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

  const handleConfirmReplace = async () => {
    if (!leastUsedToReplace || !pendingAddress) return;

    await deleteAddress(leastUsedToReplace.id);
    await saveAddress(pendingAddress);

    setShowReplaceModal(false);
    setPendingAddress(null);
    setLeastUsedToReplace(null);
  };

  const handleSelectSavedForOrder = async (item) => {
    await incrementUsage(item.id);
    // ... بقیه منطق سفارش
  };

  return (
    <>
      <MapSelector
        onLocationSelect={handleLocationSelect}
        onOpenSettings={() => setShowSavedModal(true)}
      />

      <SavedAddressesModal
        isOpen={showSavedModal}
        onClose={() => setShowSavedModal(false)}
        addresses={addresses}
        onDelete={deleteAddress}
        onUpdate={updateAddress}
      />

      <ReplaceAddressModal
        isOpen={showReplaceModal}
        onClose={() => setShowReplaceModal(false)}
        onConfirm={handleConfirmReplace}
        leastUsedAddress={leastUsedToReplace}
      />
    </>
  );
}