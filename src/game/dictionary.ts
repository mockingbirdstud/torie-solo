import expandedWords from '../data/scowl80.json'
const words=(expandedWords as string[]).map(w=>w.toUpperCase())
const dictionary = new Set(words)
const wordsByLength:(string[]|undefined)[]=[]
for(const word of words)(wordsByLength[word.length]??=[]).push(word)
export interface Dictionary { isValid(word:string):boolean; words:string[]; wordsByLength:(string[]|undefined)[] }
export const createDictionary = (allowAny=false):Dictionary => ({
  // Submitted moves and automatic legal-move detection must use the same list.
  words,
  wordsByLength,
  isValid:(word)=> allowAny ? /^[A-Z]{2,}$/i.test(word) : dictionary.has(word.toUpperCase())
})
