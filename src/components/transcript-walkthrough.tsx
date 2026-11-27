"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, AudioLines, FileCheck2 } from "lucide-react";

export function TranscriptWalkthrough() {
  const flow = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = flow.current;
    if (!element || typeof IntersectionObserver === "undefined" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.35) return;
      element.dataset.revealed = "true";
      observer.disconnect();
    }, { threshold: 0.35 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <figure className="transcript-flow" ref={flow} aria-labelledby="transcript-flow-caption">
      <figcaption id="transcript-flow-caption">From transcript to brief decision</figcaption>
      <div className="transcript-flow-grid">
        <div className="transcript-flow-card transcript-flow-source">
          <div className="transcript-flow-label">
            <AudioLines size={16} aria-hidden="true" />
            <span>Transcript excerpt</span>
          </div>
          <blockquote>“Let’s build a <mark>five-page site with a contact form.</mark>”</blockquote>
        </div>
        <div className="transcript-flow-bridge" aria-hidden="true">
          <span />
          <ArrowRight size={17} />
          <span />
        </div>
        <div className="transcript-flow-card transcript-flow-result">
          <div className="transcript-flow-label">
            <FileCheck2 size={16} aria-hidden="true" />
            <span>Brief decision</span>
          </div>
          <p>Build a five-page website with a contact form.</p>
        </div>
      </div>
    </figure>
  );
}
