"use client";
import { useEffect, useRef } from "react";
import { Design } from "../../../packages/domain/src/index";
import { Artwork } from "./artwork";
import { Icon } from "./icons";
export function ArtworkDialog({
  design,
  onClose,
}: {
  design: Design;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      className="preview-modal"
      ref={dialog}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
      aria-label="Larger artwork preview"
    >
      <button
        autoFocus
        className="icon-button"
        onClick={onClose}
        aria-label="Close preview"
      >
        <Icon name="close" />
      </button>
      <Artwork design={design} />
    </dialog>
  );
}
