// "use client";

// import { useState, useEffect, useRef } from "react";
// import { MapPin, Loader2, Search } from "lucide-react";
// import axios from "axios";

// export interface LocationResult {
//   display_name: string;
//   lat: string;
//   lon: string;
// }

// interface LocationTypeaheadProps {
//   value: string;
//   onChange: (value: string, lat?: string, lng?: string) => void;
//   placeholder?: string;
// }

// export default function LocationTypeahead({ value, onChange, placeholder = "Search destination..." }: LocationTypeaheadProps) {
//   const [query, setQuery] = useState(value);
//   const [results, setResults] = useState<LocationResult[]>([]);
//   const [isOpen, setIsOpen] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const wrapperRef = useRef<HTMLDivElement>(null);

//   // Sync external value changes (e.g., if parent clears the form)
//   useEffect(() => {
//     setQuery(value);
//   }, [value]);

//   // Handle clicking outside the dropdown to close it
//   useEffect(() => {
//     function handleClickOutside(event: MouseEvent) {
//       if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
//         setIsOpen(false);
//       }
//     }
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // Debounced API Fetch
// useEffect(() => {
//   // Wait for at least 2 characters
//   if (!query || query.length < 2) {
//     setResults([]);
//     setIsOpen(false);
//     return;
//   }

//   const delayDebounceFn = setTimeout(async () => {
//     setIsLoading(true);
//     try {
//       const res = await axios.get(
//         `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&featuretype=city`
//       );

//       // Only open the dropdown if we found results AND the user is still actively focused
//       if (res.data && res.data.length > 0) {
//         setResults(res.data);
//         setIsOpen(true);
//       }
//     } catch (error) {
//       console.error("Location search failed:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   }, 500);

//   return () => clearTimeout(delayDebounceFn);
// }, [query]); // Note: We removed 'value' from the dependency array!

//   const handleSelect = (loc: LocationResult) => {
//     // Format the name nicely (e.g., "Tokyo, Japan" instead of a massive string)
//     const nameParts = loc.display_name.split(", ");
//     const cleanName = nameParts.length > 2 
//       ? `${nameParts[0]}, ${nameParts[nameParts.length - 1]}` 
//       : loc.display_name;

//     setQuery(cleanName);
//     setIsOpen(false);
//     // Pass the name, lat, and lng back up to the parent form
//     onChange(cleanName, loc.lat, loc.lon);
//   };

//   return (
//     <div ref={wrapperRef} className="relative w-full">
//       <div className="relative">
//         <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
//         <input
//           type="text"
//           value={query}
//           onChange={(e) => {
//             setQuery(e.target.value);
//             onChange(e.target.value); // Keep parent in sync even if they don't click a suggestion
//           }}
//           onFocus={() => {
//             if (results.length > 0) setIsOpen(true);
//           }}
//           placeholder={placeholder}
//           className="w-full pl-9 pr-10 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
//         />
//         {isLoading && (
//           <div className="absolute right-3 top-1/2 -translate-y-1/2">
//             <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
//           </div>
//         )}
//       </div>

//       {/* The Dropdown Menu */}
//       {isOpen && results.length > 0 && (
//         <ul className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
//           {results.map((loc, index) => (
//             <li
//               key={`${loc.lat}-${loc.lon}-${index}`}
//               onClick={() => handleSelect(loc)}
//               className="px-4 py-3 hover:bg-zinc-50 cursor-pointer flex items-start gap-3 border-b border-zinc-100 last:border-0 transition-colors"
//             >
//               <Search className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
//               <span className="text-sm text-zinc-700 line-clamp-2">
//                 {loc.display_name}
//               </span>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }

"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import axios from "axios";

// export interface OpenMeteoResult {
//   id: number;
//   name: string;
//   latitude: number;
//   longitude: number;
//   country: string;
//   admin1?: string; // This is usually the State or Province
// }

// Geoapify returns features with properties containing the data
export interface LocationResult {
    properties: {
        formatted: string;
        lat: number;
        lon: number;
    };
}

interface LocationTypeaheadProps {
    value: string;
    onChange: (value: string, lat?: number, lng?: number) => void;
    placeholder?: string;
}

export default function LocationTypeahead({ value, onChange, placeholder = "Search destination..." }: LocationTypeaheadProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<LocationResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync external value changes
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Handle clicking outside the dropdown to close it
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced API Fetch using Open-Meteo
    useEffect(() => {
        if (!query || query.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsLoading(true);
            try {
                // Pointing to your backend search-locations route
                const res = await axios.get(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/trips/search-locations?query=${encodeURIComponent(query)}`
                );

                if (res.data && res.data.length > 0) {
                    setResults(res.data);
                    setIsOpen(true);
                } else {
                    setResults([]);
                }
            } catch (error) {
                console.error("Location search failed:", error);
            } finally {
                setIsLoading(false);
            }
        }, 400); // 400ms debounce

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSelect = (loc: LocationResult) => {
        // Format the name nicely: "City, State, Country" or just "City, Country"
        // const displayName = loc.admin1
        //     ? `${loc.name}, ${loc.admin1}, ${loc.country}`
        //     : `${loc.name}, ${loc.country}`;

        // setQuery(displayName);
        // setIsOpen(false);

        // // Pass the formatted name and exact coordinates back to the parent
        // onChange(displayName, loc.latitude, loc.longitude);
        const displayName = loc.properties.formatted;

        setQuery(displayName);
        setIsOpen(false);

        // Pass the formatted name and coordinates back to the parent
        onChange(displayName, loc.properties.lat, loc.properties.lon);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChange(e.target.value);
                    }}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
                    </div>
                )}
            </div>

            {/* The Dropdown Menu */}
            {isOpen && results.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                    {results.map((loc,index) => (
                        <li
                            key={index}
                            onClick={() => handleSelect(loc)}
                            className="px-4 py-3 hover:bg-zinc-50 cursor-pointer flex items-start gap-3 border-b border-zinc-100 last:border-0 transition-colors"
                        >
                            <Search className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                            <span className="text-sm text-zinc-900">
                                {loc.properties.formatted}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}