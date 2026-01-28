import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  // Base styles - refined for modern SaaS ERP
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-lg",
    "text-sm font-medium",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "shadow-sm hover:shadow-md",
          "hover:bg-primary-700",
          "border border-transparent",
        ].join(" "),

        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-sm hover:shadow-md",
          "hover:bg-red-600",
          "border border-transparent",
        ].join(" "),

        outline: [
          "border border-border bg-transparent",
          "text-foreground",
          "hover:bg-accent hover:text-accent-foreground hover:border-border-focus",
          "shadow-xs",
        ].join(" "),

        secondary: [
          "bg-secondary text-secondary-foreground",
          "border border-border-light",
          "hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200",
          "shadow-xs",
        ].join(" "),

        ghost: [
          "text-muted-foreground",
          "hover:bg-accent hover:text-accent-foreground",
        ].join(" "),

        link: [
          "text-primary underline-offset-4",
          "hover:underline",
        ].join(" "),

        // Success variant for confirmations
        success: [
          "bg-success text-success-foreground",
          "shadow-sm hover:shadow-md",
          "hover:brightness-90",
          "border border-transparent",
        ].join(" "),

        // Soft/muted variant for secondary actions
        soft: [
          "bg-primary-50 text-primary-700",
          "hover:bg-primary-100",
          "border border-primary-100",
        ].join(" "),
      },
      size: {
        default: "h-10 px-4 py-2 [&_svg]:size-4",
        xs: "h-7 px-2 text-xs rounded-md [&_svg]:size-3",
        sm: "h-8 px-3 text-xs rounded-md [&_svg]:size-3.5",
        lg: "h-11 px-6 text-base rounded-lg [&_svg]:size-5",
        xl: "h-12 px-8 text-base rounded-xl [&_svg]:size-5",
        icon: "h-10 w-10 [&_svg]:size-4",
        "icon-sm": "h-8 w-8 [&_svg]:size-4",
        "icon-xs": "h-7 w-7 [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
