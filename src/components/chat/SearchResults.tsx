"use client";

import { useState } from "react";
import { SearchQuery } from "@/types/chat";

interface SearchResultsProps {
  searchQueries: SearchQuery[];
}

function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function SearchQueryItem({ searchQuery }: { searchQuery: SearchQuery }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg
            className="w-4 h-4 text-muted-foreground shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-sm truncate">{searchQuery.query}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            결과 {searchQuery.results.length}개
          </span>
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border bg-muted/30">
          {searchQuery.results.map((result, index) => (
            <a
              key={index}
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors"
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${getDomain(result.url)}&sz=16`}
                alt=""
                className="w-4 h-4 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-sm truncate flex-1">{result.title}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {getDomain(result.url)}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchResults({ searchQueries }: SearchResultsProps) {
  if (searchQueries.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      {searchQueries.map((query, index) => (
        <SearchQueryItem key={index} searchQuery={query} />
      ))}
    </div>
  );
}
