import { useState, useEffect } from "react";

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        return JSON.parse(saved); // ✅ parse arrays/objects
      } catch {
        return saved;
      }
    }
    return initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value)); // ✅ stringify
  }, [key, value]);

  return [value, setValue];
}

export default useLocalStorage;
