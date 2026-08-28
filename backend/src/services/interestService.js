export const calculateInterestRate = ({
  messages = 0,
  replies = 0,
  mentions = 0,
  reactions = 0
}) => {
  // Edge Case: Force inputs to be non-negative numbers, defaulting to 0 if NaN/invalid
  const safeMessages = Math.max(0, Number(messages) || 0);
  const safeReplies = Math.max(0, Number(replies) || 0);
  const safeMentions = Math.max(0, Number(mentions) || 0);
  const safeReactions = Math.max(0, Number(reactions) || 0);

  const interestRate =
    safeMessages * 0.4 +
    safeReplies * 0.3 +
    safeMentions * 0.2 +
    safeReactions * 0.1;

  return {
    messages: safeMessages,
    replies: safeReplies,
    mentions: safeMentions,
    reactions: safeReactions,
    // toFixed returns a string, so we cast it back to a clean Number
    interestRate: Number(interestRate.toFixed(2))
  };
};