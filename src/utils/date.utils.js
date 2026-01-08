const getKstDate = () => {
  const now = new Date();
  // UTC 시간에 9시간(9 * 60 * 60 * 1000ms)을 더해 KST '수치'를 만듦
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kstDate;
};

export { getKstDate };
