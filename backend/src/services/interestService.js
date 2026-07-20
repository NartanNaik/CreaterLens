export const calculateInterestRate = ({
  messages = 0,
  replies = 0,
  mentions = 0,
  reactions = 0
}) => {
  const interestRate =
    messages * 0.4 +
    replies * 0.3 +
    mentions * 0.2 +
    reactions * 0.1;

  return {
    messages: Number(messages),
    replies: Number(replies),
    mentions: Number(mentions),
    reactions: Number(reactions),
    interestRate: Number(interestRate.toFixed(2))
  };
};