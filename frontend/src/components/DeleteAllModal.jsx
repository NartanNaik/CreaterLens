import { useEffect, useRef, useState } from "react";

function DeleteAllModal({
  open,
  category,
  onClose,
  onConfirm,
  title = "Delete All Usernames",
  description,
  confirmLabel = "Delete All Usernames"
}) {
  const [step, setStep] = useState(1);
  const [typedName, setTypedName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setTypedName("");
    }
  }, [open]);

  useEffect(() => {
    if (step === 2 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  useEffect(() => {
    if (open) {
      const handleEsc = (e) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [open, onClose]);

  if (!open) return null;

  const handlePaste = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
  };

  const isMatch = typedName === category;

  const defaultDesc = `You are about to permanently delete <strong>all usernames</strong> in the category <strong>"${category}"</strong>. This action cannot be undone.`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content delall-modal" onClick={(e) => e.stopPropagation()}>
        {step === 1 ? (
          <>
            <div className="delall-icon-wrap">
              <svg className="svg-icon warning-icon-xlarge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h2>{title}</h2>
            <p className="delall-desc" dangerouslySetInnerHTML={{ __html: description || defaultDesc }} />
            <div className="modal-actions delall-buttons">
              <button className="delall-danger-btn" onClick={() => setStep(2)}>
                Confirm Delete
              </button>
              <button className="delall-cancel-btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="delall-icon-wrap step2">
              <svg className="svg-icon shield-icon-xlarge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <line x1="9" y1="12" x2="15" y2="12"/>
              </svg>
            </div>
            <h2>Type to Confirm</h2>
            <p className="delall-desc">
              To confirm, type the category name <strong>"{category}"</strong> exactly as shown below.
            </p>
            <input
              ref={inputRef}
              type="text"
              className="delall-input"
              placeholder={`Type "${category}" to confirm`}
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              onPaste={handlePaste}
              onDrop={handleDrop}
              autoComplete="off"
              spellCheck="false"
            />
            {typedName && !isMatch && (
              <p className="delall-mismatch">Category name does not match.</p>
            )}
            <div className="modal-actions delall-buttons">
              <button
                className="delall-danger-btn"
                disabled={!isMatch}
                onClick={() => {
                  if (isMatch) onConfirm();
                }}
              >
                {confirmLabel}
              </button>
              <button className="delall-cancel-btn" onClick={() => setStep(1)}>
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DeleteAllModal;