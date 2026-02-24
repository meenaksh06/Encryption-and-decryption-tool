"use client";

const defaultClass = "flex-shrink-0";
const stroke = 1.5;
const viewBox = "0 0 24 24";

export function LockIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

export function HashIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  );
}

export function TrashIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export function CloudIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  );
}

export function KeyIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

export function ChatIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

export function ShieldIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

export function ArrowRightIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14m-7-7l7 7-7 7" />
    </svg>
  );
}

export function ChevronDownIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function MenuIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function XIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function CheckIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function XCircleIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

export function InfoIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

export function DocumentIcon({ className = defaultClass, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}
