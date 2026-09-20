"use client";

import { useEffect, useState } from "react";

export default function DocsToc({
  toc,
}: {
  toc: readonly (readonly [string, string])[];
}) {
  const [activeId, setActiveId] = useState<string>(toc[0]?.[0] ?? "");

  useEffect(() => {
    const sections = toc
      .map(([id]) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    // Whichever section is nearest the top of the viewport (within a band
    // just below the sticky header) is "current" - not just whichever
    // crosses the very top edge, so the highlight stays accurate while
    // scrolling through a long section rather than flickering between
    // sections at the exact boundary.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        );
        setActiveId(topMost.target.id);
      },
      { rootMargin: "-140px 0px -70% 0px", threshold: 0 }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc]);

  return (
    <nav
      aria-label="Table of contents"
      className="sticky top-0 z-10 -mx-6 mb-10 border-b border-ink-100 bg-ink-50/90 px-6 py-3 backdrop-blur-sm"
    >
      <div className="flex flex-wrap gap-1.5 text-sm">
        {toc.map(([id, title]) => {
          const isActive = id === activeId;
          return (
            <a
              key={id}
              href={`#${id}`}
              aria-current={isActive ? "true" : undefined}
              className={`rounded-full px-3 py-1 transition-colors duration-150 ${
                isActive
                  ? "bg-brand-50 font-medium text-brand-700"
                  : "text-ink-500 hover:bg-brand-50/60 hover:text-brand-700"
              }`}
            >
              {title}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
