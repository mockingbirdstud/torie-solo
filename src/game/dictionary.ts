import expandedWords from '../data/scowl50.json'
import { WORDS } from '../data/words'
const dictionary = new Set((expandedWords as string[]).map(w=>w.toUpperCase()))
export interface Dictionary { isValid(word:string):boolean; words:string[] }
export const createDictionary = (allowAny=false):Dictionary => ({
  // Keep automated move detection intentionally bounded while validation uses
  // the complete offline dictionary.
  words:WORDS.map(w=>w.toUpperCase()),
  isValid:(word)=> allowAny ? /^[A-Z]{2,}$/i.test(word) : dictionary.has(word.toUpperCase())
})
