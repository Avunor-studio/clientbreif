import { AudioLines } from "lucide-react";
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-icon">
        <AudioLines size={21} />
      </span>
      ClientBrief<span className="beta">BETA</span>
    </span>
  );
}
