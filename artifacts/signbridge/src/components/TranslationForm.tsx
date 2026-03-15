import { useState } from "react";
import { ArrowRight, Loader2, Languages } from "lucide-react";
import { useTranslateToASL } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { TranslateResponse } from "@workspace/api-client-react";

interface TranslationFormProps {
  onTranslateComplete: (data: TranslateResponse) => void;
}

export function TranslationForm({ onTranslateComplete }: TranslationFormProps) {
  const [text, setText] = useState("");
  const { toast } = useToast();
  
  const translateMutation = useTranslateToASL({
    mutation: {
      onSuccess: (data) => {
        onTranslateComplete(data);
        toast({
          title: "Translation complete",
          description: "Successfully mapped to ASL structure.",
        });
      },
      onError: (error) => {
        toast({
          title: "Translation failed",
          description: error.message || "An error occurred while translating.",
          variant: "destructive",
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast({
        title: "Empty input",
        description: "Please enter some text to translate.",
        variant: "destructive"
      });
      return;
    }
    translateMutation.mutate({ data: { text } });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-topic/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
        <div className="relative bg-card rounded-2xl shadow-sm border border-border overflow-hidden focus-within:border-primary/50 transition-colors">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-secondary/20">
            <Languages className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">English Input</span>
          </div>
          
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste english sentences here..."
            className="w-full min-h-[160px] p-4 bg-transparent text-foreground placeholder:text-muted-foreground/60 resize-y focus:outline-none text-base md:text-lg leading-relaxed"
            disabled={translateMutation.isPending}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={translateMutation.isPending || !text.trim()}
          className={cn(
            "relative flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white shadow-lg overflow-hidden transition-all duration-300 ease-out hover-elevate",
            translateMutation.isPending ? "bg-muted text-muted-foreground shadow-none cursor-not-allowed" : "bg-primary hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0"
          )}
        >
          {translateMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Translating...</span>
            </>
          ) : (
            <>
              <span>Translate to ASL</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
