import { useEffect, useState } from "react";
import BaseModal from "../../basemodal/BaseModal";

export default function AddressModal({
  isOpen,
  onClose,
  onSubmit,

  plaque,
  unit,
  title,
  address,

  onSelectDifferentDestination,
}) {
  const [localPlaque, setLocalPlaque] = useState(plaque || "");
  const [localUnit, setLocalUnit] = useState(unit || "");
  const [localTitle, setLocalTitle] = useState(title || "");
  const [description, setDescription] = useState("");

  const [differentDestination, setDifferentDestination] =
    useState(false);

  useEffect(() => {
    setLocalPlaque(plaque || "");
    setLocalUnit(unit || "");
    setLocalTitle(title || "");
  }, [plaque, unit, title]);

  // ---------------- validation ----------------

  const plaqueValid =
    localPlaque.trim() !== "" &&
    /^\d+$/.test(localPlaque);

  const unitValid =
    localUnit.trim() !== "" &&
    /^\d+$/.test(localUnit);

  const formValid = plaqueValid && unitValid;

  // ---------------- submit ----------------

  const handleSubmit = () => {
    if (!formValid) return;

    onSubmit({
      plaque: localPlaque,
      unit: localUnit,
      title: localTitle,
      description,
      differentDestination,
    });
  };

  // ---------------- different destination ----------------

  const handleDifferentDestination = () => {
    if (!formValid) return;

    onSelectDifferentDestination?.({
      plaque: localPlaque,
      unit: localUnit,
      title: localTitle,
      description,
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title="اطلاعات آدرس"
    >
      
      <div className="flex flex-col">
        {/* ADDRESS */}
        <div
          className="
          mb-5

          rounded-3xl

          bg-gray-100
          dark:bg-zinc-800

          p-4
        "
        >
          <p
            className="
            text-sm
            leading-7

            text-gray-700
            dark:text-gray-200
          "
          >
            {address || "آدرسی انتخاب نشده"}
          </p>
        </div>

        {/* PLAQUE + UNIT */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col">
            <label className="text-xs mb-1 text-gray-500">
              پلاک
            </label>

            <input
              type="number"
              placeholder="مثلاً ۱۲"
              value={localPlaque}
              onChange={(e) =>
                setLocalPlaque(e.target.value)
              }
              className={`
                h-12
                rounded-2xl
                border
                px-4
                outline-none
                transition

                ${
                  localPlaque && !plaqueValid
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-200 dark:border-zinc-700 focus:ring-sky-300"
                }

                bg-white
                dark:bg-zinc-800
              `}
            />

            {localPlaque && !plaqueValid && (
              <span className="text-red-500 text-xs mt-1">
                پلاک معتبر وارد کنید
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <label className="text-xs mb-1 text-gray-500">
              واحد
            </label>

            <input
              type="number"
              placeholder="مثلاً ۳"
              value={localUnit}
              onChange={(e) =>
                setLocalUnit(e.target.value)
              }
              className={`
                h-12
                rounded-2xl
                border
                px-4
                outline-none
                transition

                ${
                  localUnit && !unitValid
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-200 dark:border-zinc-700 focus:ring-sky-300"
                }

                bg-white
                dark:bg-zinc-800
              `}
            />

            {localUnit && !unitValid && (
              <span className="text-red-500 text-xs mt-1">
                واحد معتبر وارد کنید
              </span>
            )}
          </div>
        </div>

        {/* TITLE */}
        <div className="mb-4">
          <label className="text-xs mb-1 block text-gray-500">
            عنوان آدرس
          </label>

          <input
            placeholder="خانه، محل کار ..."
            value={localTitle}
            onChange={(e) =>
              setLocalTitle(e.target.value)
            }
            className="
            w-full
            h-12

            rounded-2xl

            border
            border-gray-200
            dark:border-zinc-700

            bg-white
            dark:bg-zinc-800

            px-4

            outline-none

            focus:ring-2
            focus:ring-sky-300

            transition
          "
          />
        </div>

        {/* DESCRIPTION */}
        <div className="mb-5">
          <label className="text-xs mb-1 block text-gray-500">
            توضیحات اضافی
          </label>

          <textarea
            rows={4}
            placeholder="مثلاً زنگ خراب است، طبقه دوم ..."
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            className="
            w-full

            rounded-2xl

            border
            border-gray-200
            dark:border-zinc-700

            bg-white
            dark:bg-zinc-800

            px-4
            py-3

            outline-none

            focus:ring-2
            focus:ring-sky-300

            transition

            resize-none
          "
          />
        </div>

        {/* DIFFERENT DESTINATION */}
        <button
          type="button"
          onClick={handleDifferentDestination}
          disabled={!formValid}
          className={`
            w-full
            h-12

            rounded-2xl

            border-2
            border-dashed

            mb-4

            font-bold

            transition

            ${
              formValid
                ? `
                  border-sky-400
                  text-sky-600
                  hover:bg-sky-50
                  dark:hover:bg-zinc-800
                `
                : `
                  border-gray-300
                  text-gray-400
                  cursor-not-allowed
                `
            }
          `}
        >
          مقصد تحویل گرفتن فرق می‌کند
        </button>

        {/* ACTIONS */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="
            flex-1
            h-12

            rounded-2xl

            bg-gray-100
            dark:bg-zinc-800

            text-gray-700
            dark:text-gray-200

            font-bold

            transition
            hover:opacity-80
          "
          >
            انصراف
          </button>

          <button
            onClick={handleSubmit}
            disabled={!formValid}
            className={`
              flex-1
              h-12

              rounded-2xl

              text-white
              font-bold

              transition

              ${
                formValid
                  ? `
                    bg-green-500
                    hover:bg-green-600
                  `
                  : `
                    bg-gray-300
                    cursor-not-allowed
                  `
              }
            `}
          >
            ثبت آدرس
          </button>
        </div>
      </div>
    </BaseModal>
  );
}