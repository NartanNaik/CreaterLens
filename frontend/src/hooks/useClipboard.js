import { useState } from "react";

function useClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  return {
    copied,
    copy
  };
}

export default useClipboard;