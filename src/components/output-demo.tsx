"use client";

import { useState } from "react";
import { Check, FileText, Link2, ListChecks, Mail } from "lucide-react";
import { BriefPreview } from "./brief-preview";

const tabs = [
  { label: "Project brief", icon: FileText },
  { label: "Decisions", icon: Check },
  { label: "Action items", icon: ListChecks },
  { label: "Follow-up email", icon: Mail },
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
        {tabs.map(({ label, icon: Icon }, index) => (
          <button
            key={label}
            type="button"
            id={`demo-tab-${index}`}
            role="tab"
            aria-selected={selected === index}
            aria-controls={`demo-panel-${index}`}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => setSelected(index)}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <div className="demo-content">
        {tabs.map(({ label }, index) => (
          <div
            key={label}
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
          <summary>Read the example transcript excerpt</summary>
          <p>
            “We agreed on a 5-page website and a contact form. Alex will send
            the logo. The delivery date is not decided. Please confirm who will
            provide the photographs.”
          </p>
        </details>
      </div>
    </div>
  );
}

function ExampleOutput({ index }: { index: number }) {
  if (index === 0) return <BriefPreview />;
  if (index === 1)
    return (
      <div className="demo-writing">
        <h3>Decisions from the discovery call</h3>
        <div className="demo-decision">
          <Check size={18} aria-hidden="true" />
          <div>
            <strong>Build a five-page website with a contact form.</strong>
            <span className="source-note">
              <Link2 size={12} aria-hidden="true" /> Discovery call transcript
            </span>
          </div>
        </div>
      </div>
    );
  if (index === 2)
    return (
      <div className="demo-writing">
        <h3>Action items</h3>
        <div className="sample-task">
          <span className="task-square" aria-hidden="true" />
          <div>
            <strong>Send the logo</strong>
            <div className="sample-task-meta">
              <span>Owner: Alex</span>
              <span>Due: To confirm</span>
            </div>
          </div>
        </div>
        <div className="sample-task">
          <span className="task-square" aria-hidden="true" />
          <div>
            <strong>Confirm who will supply the photographs</strong>
            <div className="sample-task-meta">
              <span>Owner: Unassigned</span>
              <span>Due: To confirm</span>
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="demo-writing sample-email">
      <h3>North Star website discovery follow-up</h3>
      <p>Hi team,</p>
      <p>
        Thanks for joining the discovery call. We agreed on a five-page website
        and contact form, and Alex will send the logo.
      </p>
      <p>
        Please confirm who will supply the photographs and let us know once the
        delivery date is decided.
      </p>
    </div>
  );
}
