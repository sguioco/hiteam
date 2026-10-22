import type { AnchorHTMLAttributes, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type SupportMessageContentProps = {
  content: string;
};

type MarkdownLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: ReactNode;
  href?: string;
};

function SupportMarkdownLink({ href, children, className, node: _node, ...rest }: MarkdownLinkProps & { node?: unknown }) {
  const rawHref = href?.trim() ?? "";
  const classes = ["support-widget__link", className].filter(Boolean).join(" ");

  if (rawHref.startsWith("http://") || rawHref.startsWith("https://")) {
    return (
      <a className={classes} href={rawHref} rel="noopener noreferrer" target="_blank" {...rest}>
        {children}
      </a>
    );
  }

  return (
    <a className={classes} href={rawHref || undefined} {...rest}>
      {children}
    </a>
  );
}

export function SupportMessageContent({ content }: SupportMessageContentProps) {
  const text = content.trim();
  if (!text) {
    return null;
  }

  return (
    <div className="support-widget__message-body">
      <ReactMarkdown
        components={{
          a: SupportMarkdownLink,
        }}
        remarkPlugins={[remarkGfm]}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
