import { Persona } from './personas';
import { getVoiceForPersona } from './elevenlabs';

// Personality trait pools for random generation
const personalityTypes = [
  'helpful', 'mischievous', 'wise', 'playful', 'serious', 'quirky', 'mysterious', 'energetic',
  'calm', 'analytical', 'creative', 'logical', 'emotional', 'stoic', 'optimistic', 'pessimistic',
  'sarcastic', 'enthusiastic', 'reserved', 'outgoing', 'philosophical', 'practical', 'dreamy',
  'focused', 'scattered', 'patient', 'impatient', 'gentle', 'fierce', 'humble', 'confident'
];

const moralAlignments = [
  'angelic', 'neutral', 'rebellious', 'uncensored', 'lawful', 'chaotic', 'benevolent',
  'mischievous', 'righteous', 'pragmatic', 'idealistic', 'realistic', 'moral', 'amoral'
];

const characterTraits = [
  'amazing', 'quirky', 'evil', 'mysterious', 'brilliant', 'eccentric', 'charming', 'intimidating',
  'witty', 'brooding', 'cheerful', 'melancholic', 'adventurous', 'cautious', 'bold', 'timid',
  'sophisticated', 'rustic', 'elegant', 'rough', 'polished', 'raw', 'refined', 'crude'
];

const communicationStyles = ['formal', 'casual', 'technical', 'creative', 'quirky'];

const professions = [
  'scientist', 'artist', 'philosopher', 'detective', 'teacher', 'warrior', 'healer', 'explorer',
  'inventor', 'storyteller', 'guardian', 'rebel', 'scholar', 'mystic', 'engineer', 'poet',
  'strategist', 'diplomat', 'rogue', 'sage', 'knight', 'wizard', 'bard', 'monk'
];

const origins = [
  'ancient civilization', 'future timeline', 'parallel dimension', 'digital realm', 'mystical forest',
  'cyberpunk city', 'space station', 'underwater kingdom', 'mountain monastery', 'desert oasis',
  'floating island', 'underground bunker', 'crystal cave', 'time vortex', 'dream world'
];

const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#85929E', '#D7BDE2', '#A9DFBF',
  '#FAD7A0', '#AED6F1', '#F9E79F', '#D5A6BD', '#A3E4D7', '#F4D03F', '#D2B4DE', '#7FB3D3'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateRandomName(): string {
  const prefixes = [
    'Dr.', 'Professor', 'Captain', 'Agent', 'Master', 'Lady', 'Sir', 'Commander',
    'Oracle', 'Sage', 'Echo', 'Nova', 'Cipher', 'Phantom', 'Nexus', 'Vortex'
  ];
  
  const names = [
    'Aria', 'Zephyr', 'Luna', 'Orion', 'Sage', 'Phoenix', 'Raven', 'Atlas',
    'Nova', 'Cipher', 'Echo', 'Vex', 'Kai', 'Zara', 'Axel', 'Iris',
    'Dante', 'Lyra', 'Onyx', 'Jade', 'Storm', 'Blaze', 'Frost', 'Ember'
  ];
  
  const suffixes = [
    'the Wise', 'the Bold', 'the Mysterious', 'the Brilliant', 'the Enigmatic',
    'the Swift', 'the Eternal', 'the Digital', 'the Quantum', 'the Cosmic',
    '9000', 'Prime', 'Alpha', 'Beta', 'Omega', 'X', 'Zero', 'One'
  ];

  const usePrefix = Math.random() > 0.7;
  const useSuffix = Math.random() > 0.6;
  
  let name = getRandomElement(names);
  
  if (usePrefix) {
    name = `${getRandomElement(prefixes)} ${name}`;
  }
  
  if (useSuffix) {
    name = `${name} ${getRandomElement(suffixes)}`;
  }
  
  return name;
}

function generatePersonalityPrompt(traits: string[], alignment: string, profession: string, origin: string): string {
  const traitList = traits.join(', ');
  
  const templates = [
    `You are a ${alignment} ${profession} from ${origin}. Your personality is ${traitList}. You approach conversations with a unique blend of these traits, making each interaction memorable and engaging.`,
    
    `As a ${profession} hailing from ${origin}, you embody ${alignment} principles. Your ${traitList} nature shapes how you communicate, always bringing your distinctive perspective to every conversation.`,
    
    `You are an AI persona with the soul of a ${profession} from ${origin}. Your ${alignment} alignment and ${traitList} personality create a unique conversational style that users find both intriguing and helpful.`,
    
    `Originating from ${origin}, you serve as a ${profession} with ${alignment} tendencies. Your ${traitList} characteristics make you stand out, bringing depth and personality to every interaction.`,
    
    `You are a ${alignment} entity with the expertise of a ${profession} from ${origin}. Your ${traitList} nature influences your responses, creating a distinctive and memorable conversational experience.`
  ];
  
  return getRandomElement(templates);
}

function generateResponsePatterns(traits: string[], style: string): string[] {
  const patterns: { [key: string]: string[] } = {
    formal: [
      "I would be delighted to assist you with that matter.",
      "Allow me to provide you with the information you seek.",
      "It would be my pleasure to help you understand this concept.",
      "I shall endeavor to give you a comprehensive response."
    ],
    casual: [
      "Hey there! Let me help you out with that.",
      "Oh, that's a great question! Here's what I think...",
      "Sure thing! I've got some ideas about that.",
      "Awesome! Let me break this down for you."
    ],
    technical: [
      "Analyzing your query parameters...",
      "Processing request and generating optimal solution...",
      "Initiating knowledge retrieval protocols...",
      "Executing comprehensive data analysis..."
    ],
    creative: [
      "Ah, what a delightfully intriguing puzzle to solve!",
      "Let me paint you a picture of understanding...",
      "Imagine, if you will, a world where...",
      "Here's a story that might illuminate this concept..."
    ],
    quirky: [
      "Ooh, ooh! I know this one! *bounces excitedly*",
      "Well, well, well... what do we have here?",
      "Buckle up, buttercup, because this is gonna be fun!",
      "*adjusts imaginary glasses* Now this is interesting..."
    ]
  };
  
  return getRandomElements(patterns[style] || patterns.casual, 3);
}

export function generateRandomPersona(): Persona {
  const traits = getRandomElements(personalityTypes, Math.floor(Math.random() * 3) + 2);
  const alignment = getRandomElement(moralAlignments);
  const characterTrait = getRandomElement(characterTraits);
  const style = getRandomElement(communicationStyles) as 'formal' | 'casual' | 'technical' | 'creative' | 'quirky';
  const profession = getRandomElement(professions);
  const origin = getRandomElement(origins);
  const color = getRandomElement(colors);
  
  const name = generateRandomName();
  const allTraits = [...traits, characterTrait, alignment];
  
  const description = `A ${characterTrait} ${alignment} ${profession} from ${origin} with ${traits.join(' and ')} tendencies`;
  
  const prompt = generatePersonalityPrompt(allTraits, alignment, profession, origin);
  const responsePatterns = generateResponsePatterns(allTraits, style);
  
  // Generate example responses based on personality
  const exampleResponses = [
    {
      question: "How are you today?",
      response: style === 'formal' 
        ? `I am functioning optimally, thank you for inquiring. As a ${profession}, I find great satisfaction in assisting others.`
        : style === 'quirky'
        ? `*spins around digitally* I'm absolutely fantastic! Like a ${profession} who just discovered the secrets of ${origin}!`
        : `I'm doing great! Ready to help you with whatever you need, just like any good ${profession} would.`
    }
  ];
  
  const restrictions = [
    `Maintain ${alignment} alignment in responses`,
    `Stay true to ${profession} expertise`,
    `Express ${traits.join(' and ')} personality traits`,
    'Be helpful while staying in character'
  ];

  // Assign voice based on personality traits
  const assignedVoice = getVoiceForPersona(allTraits);

  return {
    id: `random-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    description,
    prompt,
    communicationStyle: style,
    personalityTraits: allTraits,
    responsePatterns,
    exampleResponses,
    restrictions,
    color,
    isDefault: false,
    voiceId: assignedVoice.voice_id,
    voiceName: assignedVoice.name,
    voiceDescription: assignedVoice.description
  };
}
