/** 마지막 글자에 받침이 있나 */
export function hasBatchim(word: string) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}
/** 단어 뒤에 받침에 맞는 조사: josa('의사', '이', '가') → '의사가' */
export const josa = (word: string, withB: string, noB: string) => word + (hasBatchim(word) ? withB : noB);
