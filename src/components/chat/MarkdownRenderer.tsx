"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Code blocks with syntax highlighting
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || "");
          const codeString = String(children).replace(/\n$/, "");

          // 블록 코드 (언어가 지정된 경우)
          if (match) {
            return <CodeBlock language={match[1]} code={codeString} />;
          }

          // 인라인 코드
          return (
            <code
              className="rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-sm text-foreground"
              {...props}
            >
              {children}
            </code>
          );
        },
        // Pre blocks (코드 블록 컨테이너)
        pre: ({ children }) => (
          <pre className="overflow-x-auto rounded-lg my-3">{children}</pre>
        ),
        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-border">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-4 py-2">{children}</td>
        ),
        // Links
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:no-underline"
          >
            {children}
          </a>
        ),
        // Lists
        ul: ({ children }) => (
          <ul className="list-disc pl-6 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 space-y-1">{children}</ol>
        ),
        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        // Paragraphs
        p: ({ children }) => <p className="leading-7">{children}</p>,
        // Headings
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
