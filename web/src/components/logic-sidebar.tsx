import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Scroll, BookOpen } from "lucide-react"

export function LogicSidebar() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <button className="p-2 hover:bg-accent rounded-full transition-colors duration-200">
                    <Scroll className="w-5 h-5 text-muted-foreground hover:text-primary" />
                    <span className="sr-only">Open Logic Tracker</span>
                </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] font-serif border-l-primary/10">
                <SheetHeader className="mb-8">
                    <SheetTitle className="font-serif text-2xl text-primary">Premise Tracker</SheetTitle>
                    <SheetDescription className="font-sans">
                        The evolving logical structure of our dialogue.
                    </SheetDescription>
                </SheetHeader>
                <div className="space-y-6">
                    <div className="p-6 border border-dashed border-primary/20 rounded-lg bg-secondary/30">
                        <h4 className="font-medium mb-3 flex items-center gap-2 font-sans text-sm tracking-wide uppercase text-muted-foreground">
                            <BookOpen className="w-4 h-4" />
                            Current Thesis
                        </h4>
                        <p className="text-lg text-foreground italic leading-relaxed">
                            "Awaiting initial proposition..."
                        </p>
                    </div>

                    <div className="pt-4 border-t border-border">
                        <a href="/traces" className="text-xs text-muted-foreground hover:text-primary transition-colors font-sans flex items-center gap-2">
                            View Agent Traces &rarr;
                        </a>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
