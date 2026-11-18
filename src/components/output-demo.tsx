"use client";
import { useState } from "react";
import { ArrowUpRight, Check, Link2 } from "lucide-react";
import { BriefPreview } from "./brief-preview";

const tabs = [
  "Project brief",
  "Decisions",
  "Action items",
  "Follow-up email",
] as const;

export function OutputDemo() {
  const [selected, setSelected] = useState(0);
  return (
    <div className="output-demo">
      <div
        className="demo-tablist"
        role="tablist"
        aria-label="Example meeting outputs"
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          let next = selected;
          if (event.key === "ArrowRight") next = (selected + 1) % tabs.length;
          else if (event.key === "ArrowLeft")
            next = (selected + tabs.length - 1) % tabs.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = tabs.length - 1;
          else return;
          event.preventDefault();
          setSelected(next);
          event.currentTarget
            .querySelectorAll<HTMLButtonElement>("[role=tab]")
            [next].focus();
        }}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab}
            id={`demo-tab-${index}`}
            role="tab"
            aria-selected={selected === index}
            aria-controls={`demo-panel-${index}`}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => setSelected(index)}
          >
            <span>0{index + 1}</span>
            {tab}
            <ArrowUpRight size={15} />
          </button>
        ))}
      </div>
      <div className="demo-content">
        <div className="demo-label">
          <span>WEBSITE DISCOVERY / SAMPLE OUTPUT</span>
          <span>Human-reviewed example</span>
        </div>
        {tabs.map((tab, index) => (
          <div
            key={tab}
            role="tabpanel"
            tabIndex={0}
            hidden={selected !== index}
            id={`demo-panel-${index}`}
            aria-labelledby={`demo-tab-${index}`}
          >
            <ExampleOutput index={index} />
          </div>
        ))}
        <details className="demo-sources">
          <summary>Read the example source excerpts</summary>
          <p>
            <strong>04:32 · Alex:</strong> “Let’s keep the five core pages, and
            make the enquiry form just four fields.”
          </p>
          <p>
            <strong>08:10 · Alex:</strong> “We still need to confirm who will
            supply the photography.”
          </p>
          <p>
            <strong>09:24 · Jamie:</strong> “I’ll prepare a first proposal for
            the four-field form.”
          </p>
        </details>
      </div>
    </div>
  );
}

function ExampleOutput({ index }: { index: number }) {
  if (index === 0) return <BriefPreview compact />;
  if (index === 1)
    return (
      <div className="demo-writing">
        <h3>Decided in the room.</h3>
        <p className="demo-intro">The agreements your team can come back to.</p>
        <div className="demo-decision">
          <Check size={18} />
          <div>
            <strong>Keep the existing five-page structure.</strong>
            <p>Refresh the pages rather than expanding the sitemap.</p>
            <span className="source-note">
              <Link2 size={12} /> Discovery call · 04:32
            </span>
          </div>
        </div>
        <div className="demo-decision">
          <Check size={18} />
          <div>
            <strong>Shorten the enquiry form to four fields.</strong>
            <p>Reduce the steps between interest and a conversation.</p>
            <span className="source-note">
              <Link2 size={12} /> Discovery call · 04:32
            </span>
          </div>
        </div>
      </div>
    );
  if (index === 2)
    return (
      <div className="demo-writing">
        <h3>Next steps, made explicit.</h3>
        <p className="demo-intro">
          Owners and dates stay empty when nobody agreed them.
        </p>
        <div className="sample-task">
          <span className="task-square" />
          <div>
            <strong>Confirm the photography source</strong>
            <p>Ask who will supply the final website images.</p>
            <div className="sample-task-meta">
              <span>Owner: —</span>
              <span>Due: —</span>
              <span>Source: 08:10</span>
            </div>
          </div>
        </div>
        <div className="sample-task">
          <span className="task-square" />
          <div>
            <strong>Draft the four-field enquiry form</strong>
            <p>Prepare a proposal for review.</p>
            <div className="sample-task-meta">
              <span>Owner: Jamie</span>
              <span>Due: —</span>
              <span>Source: 09:24</span>
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="demo-writing sample-email">
      <span className="document-label">SUBJECT</span>
      <h3>Next steps for the website refresh</h3>
      <p>Hi Alex,</p>
      <p>
        Thanks for walking us through the website today. We agreed to refresh
        the five core pages and simplify the enquiry form to four fields.
      </p>
      <p>
        We still need to confirm who will supply the photography. Jamie will
        prepare a first proposal for the form.
      </p>
      <p>
        I’ve put the scope into a brief for your review. Let me know if anything
        needs adjusting.
      </p>
      <p>
        Thanks,
        <br />
        The Fieldwork team
      </p>
      <span className="source-note">
        A draft to review, copy, and send yourself.
      </span>
    </div>
  );
}
