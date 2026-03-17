import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { EducationalBanner } from "@/components/EducationalBanner";
import { TranslationForm } from "@/components/TranslationForm";
import { TranslationResult } from "@/components/TranslationResult";
import type { TranslateResponse } from "@workspace/api-client-react";

export default function Home() {
  const [result, setResult] = useState<TranslateResponse | null>(null);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="space-y-3 text-center max-w-3xl mx-auto pt-2 print:hidden">
        <h2 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Bridge the gap to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-topic">
            ASL Grammar
          </span>
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Translate English sentences into American Sign Language Topic-Comment structure instantly.
        </p>
      </section>

      {/* Educational Banner */}
      <div className="print:hidden">
        <EducationalBanner />
      </div>

      {/* Input Form */}
      <div className="print:hidden">
        <TranslationForm onTranslateComplete={setResult} />
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {result && (
          <div className="pt-4 border-t border-border">
            <h3 className="font-display text-xl font-bold mb-6">Translation</h3>
            <TranslationResult result={result} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
