// components/ColorPicker.jsx
import { useState } from "react";

const COLORS = [
  {
    name: "default",
    label: "Default",
    bg: "bg-white dark:bg-gray-800",
    border: "border-gray-300 dark:border-gray-600",
    swatch: "bg-white dark:bg-gray-700",
    swatchBorder: "border-gray-300 dark:border-gray-600",
  },
  {
    name: "red",
    label: "Red",
    bg: "bg-red-100 dark:bg-red-900/30",
    border: "border-red-300 dark:border-red-700",
    swatch: "bg-red-500",
    swatchBorder: "border-red-300",
  },
  {
    name: "orange",
    label: "Orange",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    border: "border-orange-300 dark:border-orange-700",
    swatch: "bg-orange-500",
    swatchBorder: "border-orange-300",
  },
  {
    name: "yellow",
    label: "Yellow",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    border: "border-yellow-300 dark:border-yellow-700",
    swatch: "bg-yellow-400",
    swatchBorder: "border-yellow-300",
  },
  {
    name: "green",
    label: "Green",
    bg: "bg-green-100 dark:bg-green-900/30",
    border: "border-green-300 dark:border-green-700",
    swatch: "bg-green-500",
    swatchBorder: "border-green-300",
  },
  {
    name: "teal",
    label: "Teal",
    bg: "bg-teal-100 dark:bg-teal-900/30",
    border: "border-teal-300 dark:border-teal-700",
    swatch: "bg-teal-500",
    swatchBorder: "border-teal-300",
  },
  {
    name: "blue",
    label: "Blue",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-300 dark:border-blue-700",
    swatch: "bg-blue-500",
    swatchBorder: "border-blue-300",
  },
  {
    name: "purple",
    label: "Purple",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-300 dark:border-purple-700",
    swatch: "bg-purple-500",
    swatchBorder: "border-purple-300",
  },
  {
    name: "pink",
    label: "Pink",
    bg: "bg-pink-100 dark:bg-pink-900/30",
    border: "border-pink-300 dark:border-pink-700",
    swatch: "bg-pink-500",
    swatchBorder: "border-pink-300",
  },
  {
    name: "gray",
    label: "Gray",
    bg: "bg-gray-200 dark:bg-gray-700",
    border: "border-gray-400 dark:border-gray-600",
    swatch: "bg-gray-600",
    swatchBorder: "border-gray-400",
  },
];

export default function ColorPicker({
  currentColor = "default",
  onColorChange,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleColorSelect = (color) => {
    onColorChange(color);
    setIsOpen(false);
  };

  const currentColorData =
    COLORS.find((c) => c.name === currentColor) || COLORS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl border-2 transition-all duration-200 ${
          isOpen
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm"
        }`}
        title="Change color"
        aria-label="Change color"
      >
        <div
          className={`w-5 h-5 rounded-md ${currentColorData.swatch} border-2 ${
            currentColor === "default"
              ? "border-gray-300 dark:border-gray-600"
              : currentColorData.swatchBorder || "border-white dark:border-gray-800"
          } shadow-sm`}
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {currentColorData.label}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[40]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 z-[60] min-w-[240px]">
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Note Color
              </h3>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {COLORS.map((color) => {
                const isSelected = currentColor === color.name;
                return (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => handleColorSelect(color.name)}
                    className={`group relative flex items-center justify-center transition-all duration-200 ${
                      isSelected
                        ? ""
                        : "hover:scale-105 active:scale-95"
                    }`}
                    title={color.label}
                    aria-label={color.label}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg ${color.swatch} border-2 transition-all duration-200 ${
                        isSelected
                          ? "border-gray-900 dark:border-white shadow-xl ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-800 scale-110"
                          : `${color.swatchBorder || "border-gray-200 dark:border-gray-700"} group-hover:border-opacity-80 shadow-md group-hover:shadow-lg`
                      }`}
                      style={{
                        boxShadow: isSelected 
                          ? undefined 
                          : "0 2px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)"
                      }}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg
                            className={`w-5 h-5 drop-shadow-lg ${
                              color.name === "default" || color.name === "yellow"
                                ? "text-gray-800"
                                : "text-white"
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Export color utilities for use in other components
export function getColorClasses(colorName) {
  const color = COLORS.find((c) => c.name === colorName);
  return color || COLORS[0];
}

export { COLORS };
