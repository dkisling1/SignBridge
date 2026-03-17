import { Printer, Share2, Check } from "lucide-react";
import { useState } from "react";

interface PrintShareButtonsProps {
  onGetShareText: () => string;
  title?: string;
}

export function PrintShareButtons({ onGetShareText, title }: PrintShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = onGetShareText();
    const shareData = { title: title || "SignBridge", text };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
    }
  };

  return (
    <div className="flex items-center gap-1 print:hidden">
      <button
        onClick={handlePrint}
        title="Print"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Printer className="w-4 h-4" />
        <span>Print</span>
      </button>
      <button
        onClick={handleShare}
        title="Share or copy to clipboard"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-green-600">Copied!</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </>
        )}
      </button>
    </div>
  );
}
