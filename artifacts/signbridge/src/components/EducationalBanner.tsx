import { BookOpen, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function EducationalBanner({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card rounded-2xl p-6 shadow-md border border-border/50 overflow-hidden relative", className)}>
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      
      <div className="flex items-start gap-4 relative z-10">
        <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
          <BookOpen className="w-6 h-6" />
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Understanding ASL Topic-Comment Structure</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              American Sign Language (ASL) often uses a <strong>Topic-Comment</strong> sentence structure. 
              Unlike English, which typically follows Subject-Verb-Object (SVO), ASL frequently establishes 
              what is being talked about first (the <em>Topic</em>), followed by what is being said about it (the <em>Comment</em>).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-topic/10 border border-topic/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-topic shadow-sm shadow-topic/50" />
                <h4 className="font-semibold text-topic">The Topic</h4>
              </div>
              <p className="text-xs text-foreground/80">
                The main subject or context of the sentence. It is usually signed first, often accompanied by raised eyebrows.
              </p>
            </div>
            
            <div className="bg-comment/10 border border-comment/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-comment shadow-sm shadow-comment/50" />
                <h4 className="font-semibold text-comment">The Comment</h4>
              </div>
              <p className="text-xs text-foreground/80">
                The action, description, or statement about the topic. It follows the topic and completes the thought.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 py-2 px-3 rounded-lg w-fit">
            <Info className="w-4 h-4 text-primary" />
            <span>Note: While Topic-Comment is very common, ASL also frequently uses standard SVO structure.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
