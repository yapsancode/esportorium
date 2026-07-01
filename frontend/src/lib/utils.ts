import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Shown wherever a tournament has no banner_image — matches the 16:9 aspect-video
// containers used across the card grid, list view, and detail page banner.
export const DEFAULT_BANNER = '/esportorium1920x1080.png'
