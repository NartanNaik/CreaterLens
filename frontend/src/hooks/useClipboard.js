import { useState } from 'react';

/**
 * Custom hook to handle copying text to the system clipboard with a temporary success state.
 * @returns {Object} An object containing the `copied` boolean flag and the `copy` async function.
 */
export default function useClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = async (text) => {
    if (!text) return false;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);

      return true;
    } catch (error) {
      console.error("Failed to copy text to clipboard:", error);
      setCopied(false);
      return false;
    }
  };

  return {
    copied,
    copy
  };
}