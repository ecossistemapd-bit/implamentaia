import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md bg-[#1C2333] border border-[rgba(201,168,76,0.12)] px-3 py-1 text-base text-[#E8EDF5] shadow-sm transition-colors duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#E8EDF5] placeholder:text-[#6B7A99] focus-visible:outline-none focus-visible:border-[rgba(201,168,76,0.5)] focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
