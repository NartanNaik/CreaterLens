import { useEffect, useState } from "react";
import "./InterestModal.css";

function InterestModal({
  open,
  username,
  initialData,
  onClose,
  onSave
}) {
  const [messages, setMessages] = useState(0);
  const [replies, setReplies] = useState(0);
  const [mentions, setMentions] = useState(0);
  const [reactions, setReactions] = useState(0);
  const [interestRate, setInterestRate] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    setMessages(initialData?.messages || 0);
    setReplies(initialData?.replies || 0);
    setMentions(initialData?.mentions || 0);
    setReactions(initialData?.reactions || 0);
  }, [
    open,
    initialData
  ]);

  useEffect(() => {
    const value =
      Number(messages) * 0.4 +
      Number(replies) * 0.3 +
      Number(mentions) * 0.2 +
      Number(reactions) * 0.1;

    setInterestRate(
      Number(value.toFixed(2))
    );
  }, [
    messages,
    replies,
    mentions,
    reactions
  ]);

  if (!open) {
    return null;
  }

  const handleSave = () => {
    const calculatedInterest =
      Number(
        (
          Number(messages) * 0.4 +
          Number(replies) * 0.3 +
          Number(mentions) * 0.2 +
          Number(reactions) * 0.1
        ).toFixed(2)
      );

    onSave({
      messages: Number(messages),
      replies: Number(replies),
      mentions: Number(mentions),
      reactions: Number(reactions),
      interestRate: calculatedInterest
    });
  };

  return (
    <div className="interest-modal-overlay">
      <div className="interest-modal">

        <h2>
          Interest Calculator
        </h2>

        <p className="interest-username">
          {username}
        </p>

        <div className="interest-inputs-grid">
          <div className="input-group">
            <label>Messages</label>
            <input
              type="number"
              min={0}
              value={messages}
              onChange={(e) =>
                setMessages(
                  Number(e.target.value)
                )
              }
            />
          </div>

          <div className="input-group">
            <label>Replies</label>
            <input
              type="number"
              min={0}
              value={replies}
              onChange={(e) =>
                setReplies(
                  Number(e.target.value)
                )
              }
            />
          </div>

          <div className="input-group">
            <label>Mentions</label>
            <input
              type="number"
              min={0}
              value={mentions}
              onChange={(e) =>
                setMentions(
                  Number(e.target.value)
                )
              }
            />
          </div>

          <div className="input-group">
            <label>Reactions</label>
            <input
              type="number"
              min={0}
              value={reactions}
              onChange={(e) =>
                setReactions(
                  Number(e.target.value)
                )
              }
            />
          </div>
        </div>

        <div className="interest-result">
          <strong>
            Interest Rate
          </strong>

          <span>
            {interestRate}
          </span>
        </div>

        <div className="interest-buttons">

          <button
            onClick={handleSave}
          >
            Save
          </button>

          <button
            className="secondary-btn"
            onClick={onClose}
          >
            Cancel
          </button>

        </div>

      </div>
    </div>
  );
}

export default InterestModal;