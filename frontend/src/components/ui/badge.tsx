import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:   "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline:   "border border-border text-foreground",
        upcoming:  "bg-blue-100 text-blue-700",
        current:   "bg-green-100 text-green-700",
        past:      "bg-muted text-muted-foreground",
        pending:   "bg-yellow-100 text-yellow-700",
        tbd:       "bg-yellow-100 text-yellow-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
