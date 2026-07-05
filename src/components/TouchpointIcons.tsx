import { useState, type CSSProperties, type MouseEvent } from "react";
import type { TouchpointSignal } from "../domain/types";
import type { Connector } from "../domain/connectors";
import { touchpointMeta } from "../domain/touchpoints";
import { IconPlus } from "./icons";
import { SourceMark } from "./brandIcons";
import AddSourceModal from "./AddSourceModal";

function signalLabel(signal: TouchpointSignal): string {
  return signal.label ?? touchpointMeta(signal.kind)?.label ?? "Source";
}

function signalColor(signal: TouchpointSignal): string {
  return signal.brandColor ?? touchpointMeta(signal.kind)?.brandColor ?? "#5b6b66";
}

export default function TouchpointIcons({
  signals,
  onConnect,
  onImport,
}: {
  signals: TouchpointSignal[];
  onConnect: (connector: Connector) => void;
  onImport: (fileNames: string[]) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const stopNav = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="qc-touchpoints" onClick={stopNav} onMouseDown={stopNav}>
      {signals.map((signal) => {
        const label = signalLabel(signal);
        const color = signalColor(signal);
        return (
          <span
            key={signal.sourceId ?? signal.kind}
            className={`qc-tp connected`}
            style={{ "--tp-color": color } as CSSProperties}
            title={`${label} · ${signal.summary}`}
            aria-label={`${label}: ${signal.summary}`}
          >
            <SourceMark
              kind={signal.kind}
              mono={label.slice(0, 1).toUpperCase()}
              brandColor={color}
            />
          </span>
        );
      })}

      <button
        type="button"
        className="qc-tp qc-tp-add-btn"
        title="Add source"
        aria-label="Add source"
        onClick={() => setModalOpen(true)}
      >
        <IconPlus />
      </button>

      <AddSourceModal
        open={modalOpen}
        signals={signals}
        onClose={() => setModalOpen(false)}
        onConnect={onConnect}
        onImport={(fileNames) => {
          onImport(fileNames);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
