import { useState } from "react";
import posthog from "posthog-js";
import { submitFeedback } from "../utils/supabaseData";

export default function FeedbackSection({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setStatus("sending");
    const { error } = await submitFeedback(user?.id, message);
    if (error) {
      setStatus("error");
      console.error("Feedback submit failed:", error);
      setTimeout(() => setStatus("idle"), 3000);
    } else {
      posthog.capture("feedback_submitted", { platform: "web" });
      setStatus("sent");
      setMessage("");
      setTimeout(() => {
        setStatus("idle");
        setIsOpen(false);
      }, 2500);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-pb-border bg-transparent px-3.5 py-2.5 text-[13px] font-medium text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text"
      >
        {status === "sent" ? "Feedback sent \u2713" : "Leave Feedback"}
      </button>
    );
  }

  if (status === "sent") {
    return (
      <div className="rounded-lg border border-pb-success/30 bg-pb-success/8 px-3.5 py-3 text-center text-[13px] text-pb-success">
        Thanks for your feedback!
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-pb-border bg-pb-bg p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-semibold text-pb-text-muted">What's on your mind?</label>
        <button
          onClick={() => { setIsOpen(false); setMessage(""); }}
          className="cursor-pointer border-none bg-transparent px-1 text-xs text-pb-text-dim hover:text-pb-text-muted"
        >
          ✕
        </button>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What's working? What's not? Ideas?"
        rows={3}
        autoFocus
        className="w-full resize-y rounded-lg border border-pb-border bg-pb-surface px-3 py-2.5 text-sm font-[inherit] leading-relaxed text-pb-text placeholder:text-pb-text-dim outline-none transition-colors duration-150 focus:border-pb-accent"
      />
      <button
        onClick={handleSubmit}
        disabled={!message.trim() || status === "sending"}
        className="mt-2 w-full cursor-pointer rounded-lg border border-pb-border bg-transparent py-2.5 text-[13px] font-semibold text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === "sending" ? "Sending..." : status === "error" ? "Failed \u2014 try again" : "Send Feedback"}
      </button>
    </div>
  );
}
