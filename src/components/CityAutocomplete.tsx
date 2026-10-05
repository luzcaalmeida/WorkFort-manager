import React, { useState, useEffect, useRef } from 'react';

interface CityAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

interface Place {
  display_name: string;
}

export function CityAutocomplete({ value, onChange, className }: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (value && value.length >= 3 && isOpen) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&featuretype=city&limit=5`)
          .then(res => res.json())
          .then(data => {
            setSuggestions(data);
          })
          .catch(err => console.error("Error fetching cities", err));
      } else {
        setSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [value, isOpen]);

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        required
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className={className}
        placeholder="Digite para buscar..."
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((s, idx) => (
            <li
              key={idx}
              className="px-4 py-2 hover:bg-slate-100 hover:text-slate-900 cursor-pointer text-sm text-slate-700 font-medium transition-colors"
              onClick={() => {
                // Remove some excessive details if necessary, but display_name contains 'City, Region, Country'
                onChange(s.display_name);
                setIsOpen(false);
              }}
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
