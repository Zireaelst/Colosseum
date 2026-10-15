import Link from "next/link";

export function BrandMark({ href = "/" }: { href?: string }) {
  return (
    <Link aria-label="Pactlet home" className="public-brand" href={href}>
      <svg aria-hidden="true" className="public-brand-symbol" viewBox="0 0 100 100">
        <path
          d="M22 17H62Q77 17 77 32V38Q77 53 62 53H35Q20 53 20 68V83"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="20"
        />
      </svg>
      <span>Pactlet</span>
    </Link>
  );
}
