import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // base
          "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs md:text-sm",
          // motion
          "transition-[color,background-color,border-color,box-shadow] duration-150 ease-out",
          // file input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // placeholder
          "placeholder:text-muted-foreground",
          // hover
          "hover:border-ring/40",
          // focus
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          // invalid
          "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/40",
          // disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
