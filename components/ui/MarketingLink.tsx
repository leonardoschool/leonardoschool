import NextLink, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

type MarketingLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
  };

export default function MarketingLink({
  prefetch = false,
  ...props
}: MarketingLinkProps) {
  return <NextLink prefetch={prefetch} {...props} />;
}
