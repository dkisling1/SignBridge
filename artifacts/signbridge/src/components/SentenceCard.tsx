import { motion } from "framer-motion";
import { Quote, Sparkles, MessageSquare, Tag, AlignLeft } from "lucide-react";
import type { TranslatedSentence } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export function SentenceCard({ 
  sentence, 
  index 
}: { 
  sentence: TranslatedSentence;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
      className="bg-card rounded-2xl shadow-lg border border-border/60 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:border-border"
    >
      {/* Top section: Original English */}
      <div className="p-5 border-b border-border/50 bg-secondary/30 relative">
        <div className="absolute top-4 right-4 text-muted-foreground/30">
          <Quote className="w-12 h-12 rotate-180" />
        </div>
        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
          <AlignLeft className="w-4 h-4" />
          <span>Original English</span>
        </div>
        <p className="text-lg text-foreground font-medium relative z-10">
          {sentence.original}
        </p>
      </div>

      {/* Middle section: Topic / Comment Breakdown */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-topic uppercase tracking-wider">
            <Tag className="w-3.5 h-3.5" />
            <span>Topic</span>
          </div>
          <div className="p-3 bg-topic/5 border-l-2 border-topic rounded-r-lg text-sm font-medium text-foreground">
            {sentence.topic || <span className="text-muted-foreground italic">None explicitly separated</span>}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-comment uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comment</span>
          </div>
          <div className="p-3 bg-comment/5 border-l-2 border-comment rounded-r-lg text-sm font-medium text-foreground">
            {sentence.comment || <span className="text-muted-foreground italic">None explicitly separated</span>}
          </div>
        </div>
      </div>

      {/* Bottom section: ASL Output & Notes */}
      <div className="p-5 bg-primary/5 border-t border-primary/10 mt-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>ASL Structure</span>
          </div>
          
          {/* Structure Type Badge */}
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider w-fit",
            sentence.structureType === 'topicalized' ? "bg-topic/15 text-topic" : 
            sentence.structureType === 'OSV' ? "bg-orange-500/15 text-orange-600" :
            "bg-primary/15 text-primary"
          )}>
            {sentence.structureType === 'topicalized' ? 'Topic-Comment' : sentence.structureType}
          </div>
        </div>

        {/* The Actual ASL Gloss */}
        <div className="bg-background rounded-xl p-4 border border-border shadow-sm mb-4">
          <p className="font-display font-bold text-xl md:text-2xl text-foreground uppercase tracking-wide">
            {sentence.aslStructure}
          </p>
        </div>

        {/* Notes */}
        {sentence.notes && (
          <div className="text-sm text-muted-foreground bg-background/50 rounded-lg p-3 italic">
            <strong>Note:</strong> {sentence.notes}
          </div>
        )}
      </div>
    </motion.div>
  );
}
