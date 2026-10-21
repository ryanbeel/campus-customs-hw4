/** Speech bubbles the chat bulldog shows every 30 seconds (barks + super short jokes). */
export const BUBBLE_INTERVAL_MS = 30_000
export const BUBBLE_VISIBLE_MS = 7_000

export const BULLDOG_BUBBLES = [
  'Woof! Need a paw finding your size? 🐾',
  'Arf arf! Ask me about any hoodie!',
  'Bark! I know where the Harvard tees are 😉',
  'What do you call a frozen dog? A pupsicle! 🧊',
  'Where do dogs park? The barking lot! 🚗',
  "What's a dog's favorite pizza? Pupperoni! 🍕",
  'Dog magician? A Labracadabrador! 🎩',
  'Sleeping bulldog? A bull-dozer! 💤',
  'Bow-wow! Psst… try the Surprise Me button 🎁',
  "Woof! Want me to check what's in stock?",
  'Dalmatians hate hide and seek. Always spotted! 🐕',
  'Boola Boola! 💙 Click me, I fetch answers.',
]

export function nextBubble(previous: string | null): string {
  const options = BULLDOG_BUBBLES.filter((b) => b !== previous)
  return options[Math.floor(Math.random() * options.length)]
}
