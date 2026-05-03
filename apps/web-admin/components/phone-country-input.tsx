"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

type CountryCodeOption = {
  id: string;
  code: string;
  label: string;
  searchText: string;
};

const COUNTRY_CODE_OPTIONS: CountryCodeOption[] = [
  { id: "ru-kz", code: "+7", label: "Russia / Kazakhstan", searchText: "russia kazakhstan ru kz" },
  { id: "us-ca", code: "+1", label: "United States / Canada", searchText: "united states canada us ca" },
  { id: "uk", code: "+44", label: "United Kingdom", searchText: "united kingdom uk britain england" },
  { id: "de", code: "+49", label: "Germany", searchText: "germany deutschland de" },
  { id: "es", code: "+34", label: "Spain", searchText: "spain espana es" },
  { id: "fr", code: "+33", label: "France", searchText: "france fr" },
  { id: "it", code: "+39", label: "Italy", searchText: "italy it italia" },
  { id: "pl", code: "+48", label: "Poland", searchText: "poland polska pl" },
  { id: "pt", code: "+351", label: "Portugal", searchText: "portugal pt" },
  { id: "tr", code: "+90", label: "Turkey", searchText: "turkey turkiye tr" },
  { id: "th", code: "+66", label: "Thailand", searchText: "thailand th" },
  { id: "vn", code: "+84", label: "Vietnam", searchText: "vietnam vn" },
  { id: "ae", code: "+971", label: "United Arab Emirates", searchText: "united arab emirates uae ae dubai abu dhabi" },
  { id: "sa", code: "+966", label: "Saudi Arabia", searchText: "saudi arabia sa" },
  { id: "qa", code: "+974", label: "Qatar", searchText: "qatar qa" },
  { id: "eg", code: "+20", label: "Egypt", searchText: "egypt eg" },
  { id: "uz", code: "+998", label: "Uzbekistan", searchText: "uzbekistan uz" },
];

export function getDefaultPhoneCountryCode(locale: "ru" | "en") {
  return locale === "ru" ? "+7" : "+1";
}

export function normalizePhoneCountryCode(rawValue: string) {
  const digits = rawValue.replace(/[^\d]/g, "").slice(0, 4);
  return digits ? `+${digits}` : "+";
}

export function buildPhoneWithCountryCode(countryCode: string, nationalNumber: string) {
  const normalizedCountryCode = normalizePhoneCountryCode(countryCode);
  const normalizedNumber = nationalNumber.trim();

  return normalizedCountryCode === "+"
    ? normalizedNumber
    : `${normalizedCountryCode} ${normalizedNumber}`.trim();
}

function findCountryOptionByCode(countryCode: string) {
  return COUNTRY_CODE_OPTIONS.find((option) => option.code === countryCode) ?? null;
}

type PhoneCountryInputProps = {
  countryCode: string;
  countryCodeLabel: string;
  id?: string;
  locale: "ru" | "en";
  nationalNumber: string;
  onCountryCodeChange: (countryCode: string) => void;
  onNationalNumberChange: (nationalNumber: string) => void;
  phoneLabel: string;
  placeholder?: string;
};

export function PhoneCountryInput({
  countryCode,
  countryCodeLabel,
  id,
  locale,
  nationalNumber,
  onCountryCodeChange,
  onNationalNumberChange,
  phoneLabel,
  placeholder = "999 000 00 00",
}: PhoneCountryInputProps) {
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryPickerRef = useRef<HTMLDivElement | null>(null);
  const selectedCountryOption = findCountryOptionByCode(countryCode);
  const filteredCountryOptions = useMemo(() => {
    const normalizedSearch = countrySearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return COUNTRY_CODE_OPTIONS;
    }

    return COUNTRY_CODE_OPTIONS.filter((option) => {
      const haystack = `${option.label} ${option.code} ${option.searchText}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [countrySearch]);

  useEffect(() => {
    if (!countryMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!countryPickerRef.current?.contains(event.target as Node)) {
        setCountryMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCountryMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [countryMenuOpen]);

  return (
    <div className="relative flex h-11 rounded-xl border border-input bg-white focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
      <div ref={countryPickerRef} className="relative w-[190px] shrink-0 border-r border-input">
        <button
          aria-expanded={countryMenuOpen}
          aria-haspopup="listbox"
          className="flex h-full w-full items-center justify-between gap-2 bg-transparent px-3 text-left text-sm outline-none"
          onClick={() => {
            setCountryMenuOpen((current) => !current);
            setCountrySearch("");
          }}
          type="button"
        >
          <span className="truncate text-xs">
            {selectedCountryOption?.label ?? countryCodeLabel}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        {countryMenuOpen ? (
          <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[320px] rounded-[24px] border border-border bg-popover p-2 shadow-xl">
            <div className="px-1 pb-2">
              <Input
                autoFocus
                className="h-10"
                onChange={(event) => setCountrySearch(event.target.value)}
                placeholder={locale === "ru" ? "Поиск страны" : "Search country"}
                value={countrySearch}
              />
            </div>

            <div className="max-h-64 overflow-y-auto px-1">
              {filteredCountryOptions.length ? (
                filteredCountryOptions.map((option) => (
                  <button
                    className="flex w-full items-center justify-between gap-3 rounded-[18px] px-3 py-2 text-left text-sm transition-colors hover:bg-accent/60"
                    key={option.id}
                    onClick={() => {
                      onCountryCodeChange(option.code);
                      setCountryMenuOpen(false);
                      setCountrySearch("");
                    }}
                    type="button"
                  >
                    <span className="truncate">{option.label}</span>
                    <span className="ml-auto flex items-center gap-2 text-muted-foreground">
                      <span>{option.code}</span>
                      {option.code === countryCode ? (
                        <Check className="h-4 w-4 text-foreground" />
                      ) : null}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {locale === "ru" ? "Ничего не найдено" : "No matches found"}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <input
        aria-label={countryCodeLabel}
        className="w-[76px] shrink-0 border-0 border-r border-input bg-transparent px-3 text-sm outline-none"
        inputMode="tel"
        onChange={(event) => onCountryCodeChange(normalizePhoneCountryCode(event.target.value))}
        placeholder={getDefaultPhoneCountryCode(locale)}
        value={countryCode}
      />

      <input
        aria-label={phoneLabel}
        className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none"
        id={id}
        inputMode="tel"
        onChange={(event) => onNationalNumberChange(event.target.value)}
        placeholder={placeholder}
        value={nationalNumber}
      />
    </div>
  );
}
