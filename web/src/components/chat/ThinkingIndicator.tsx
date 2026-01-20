import { Loader2 } from "lucide-react";

export interface ThinkingState {
    node: string; // 'examine' | 'aporia' | null
    tool?: string;
    toolInput?: string;
}

interface ThinkingIndicatorProps {
    state: ThinkingState | null;
}

export function ThinkingIndicator({ state }: ThinkingIndicatorProps) {
    if (!state) return null;

    return (
        <div className="flex flex-col gap-2 p-2 sm:p-4 text-sm text-muted-foreground/80 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="italic">
                    {state.node === 'examine' && "Sophia is examining the Canon..."}
                    {state.node === 'aporia' && "Sophia is formulating a response..."}
                    {(state.node === 'thinking' || !state.node) && "Sophia is thinking..."}
                </span>
            </div>

            {state.tool && (
                <div className="ml-4 sm:ml-6 text-xs font-mono text-muted-foreground/60 border-l-2 border-primary/20 pl-2">
                    <div>&gt; Tool: {state.tool}</div>
                    {state.toolInput && <div>&gt; Input: {state.toolInput}</div>}
                </div>
            )}
        </div>
    );
}
