export const calculateInterestRate = ({
  messages = 0,
  replies = 0,
  mentions = 0,
  reactions = 0
}) => {
  const parsedMessages = Number(messages) || 0;
  const parsedReplies = Number(replies) || 0;
  const parsedMentions = Number(mentions) || 0;
  const parsedReactions = Number(reactions) || 0;

  const interestRate =
    parsedMessages * 0.4 +
    parsedReplies * 0.3 +
    parsedMentions * 0.2 +
    parsedReactions * 0.1;

  return {
    messages: parsedMessages,
    replies: parsedReplies,
    mentions: parsedMentions,
    reactions: parsedReactions,
    interestRate: Number(
      interestRate.toFixed(2)
    )
  };
};

export const getInterestColor = (
  interestRate
) => {
  const value =
    Number(interestRate) || 0;

  if (value >= 80) {
    return "#137333";
  }

  if (value >= 60) {
    return "#1A73E8";
  }

  if (value >= 40) {
    return "#FBBC04";
  }

  if (value >= 20) {
    return "#F57C00";
  }

  return "#C5221F";
};

export const getInterestLabel = (
  interestRate
) => {
  const value =
    Number(interestRate) || 0;

  if (value >= 80) {
    return "Very High";
  }

  if (value >= 60) {
    return "High";
  }

  if (value >= 40) {
    return "Medium";
  }

  if (value >= 20) {
    return "Low";
  }

  return "Very Low";
};

export const formatInterestRate = (
  interestRate
) => {
  return (
    Number(interestRate) || 0
  ).toFixed(2);
};