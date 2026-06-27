import { useWindowDimensions } from "react-native";

export type Breakpoint = "mobile" | "tablet" | "desktop";

export function useBreakpoint(): {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
} {
  const { width } = useWindowDimensions();

  const breakpoint: Breakpoint =
    width >= 1024 ? "desktop" : width >= 768 ? "tablet" : "mobile";

  return {
    breakpoint,
    isMobile: breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop",
    width,
  };
}
