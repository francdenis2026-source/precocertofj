import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs md:text-sm",
          "transition-[color,background-color,border-color,box-shadow] duration-150 ease-out",
          "placeholder:text-muted-foreground",
          "hover:border-ring/40",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
