import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EducationalBanner } from "@/components/EducationalBanner";
import { TranslationForm } from "@/components/TranslationForm";
import { SentenceCard } from "@/components/SentenceCard";
import type { TranslateResponse } from "@workspace/api-client-react";

export default function Home() {
  const [result, setResult] = useState<TranslateResponse | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-inner">
              <span className="text-primary-foreground font-display font-bold text-lg leading-none">S</span>
            </div>
            <h1 className="font-display font-bold text-xl tracking-tight text-foreground">SignBridge</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-12">
        {/* Hero Section */}
        <section className="space-y-4 text-center max-w-3xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
            Bridge the gap to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-topic">ASL Grammar</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Translate standard English sentences into accurate American Sign Language Topic-Comment structure glosses instantly.
          </p>
        </section>

        {/* Educational Context */}
        <section>
          <EducationalBanner />
        </section>

        {/* Input Form */}
        <section>
          <TranslationForm onTranslateComplete={setResult} />
        </section>

        {/* Results Area */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.section 
              key="results"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-8 pt-8 border-t border-border"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-2xl font-bold">Translation Results</h3>
                <span className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full font-medium">
                  {result.sentences.length} {result.sentences.length === 1 ? 'Sentence' : 'Sentences'}
                </span>
              </div>

              {result.summary && (
                <div className="bg-secondary/50 rounded-xl p-4 text-sm text-foreground/80 leading-relaxed border border-border/50">
                  <span className="font-semibold text-foreground mr-2">Summary:</span>
                  {result.summary}
                </div>
              )}

              <div className="grid gap-6">
                {result.sentences.map((sentence, index) => (
                  <SentenceCard 
                    key={index} 
                    sentence={sentence} 
                    index={index} 
                  />
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
      
      {/* Simple Footer */}
      <footer className="mt-20 py-8 border-t border-border text-center text-sm text-muted-foreground">
        <p>SignBridge &copy; {new Date().getFullYear()}. Designed for educational purposes.</p>
      </footer>
    </div>
  );
}
