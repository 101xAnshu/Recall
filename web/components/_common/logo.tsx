import { cn } from "@/lib/utils";

export function Logo({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 30 30"
      fill="none"
      aria-hidden
      className={cn("size-[30px]", className)}
      {...props}
    >
      <rect x="1" y="1" width="28" height="28" rx="9" fill="#121212" />
      <path
        d="M9 19.5v-9l6 5.2 6-5.2v9"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22.4" cy="9.2" r="2.1" fill="#2575FF" />
    </svg>
  );
}

export default Logo;
