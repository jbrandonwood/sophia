import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"

interface CitationHoverProps {
    citation: string // e.g., "Plato, Republic, Book I"
    snippet: string // The actual text content
    children: React.ReactNode
}

export function CitationHover({ citation, snippet, children }: CitationHoverProps) {
    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                <span className="cursor-help decoration-dotted underline underline-offset-4 decoration-primary/50 hover:decoration-primary hover:bg-primary/5 transition-all rounded-sm px-0.5">
                    {children}
                </span>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 border-primary/20">
                <div className="flex justify-between space-x-4">
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold font-serif text-primary border-b border-primary/10 pb-1">{citation}</h4>
                        <p className="text-sm text-foreground/80 leading-relaxed font-serif italic">
                            &quot;{snippet}&quot;
                        </p>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    )
}
