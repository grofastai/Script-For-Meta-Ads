export const HOOK_TYPES = {
  curiosity: {
    label: 'Curiosity',
    description: 'Makes the viewer wonder what happens next',
    examples: ['Nobody tells you this...', 'Most people get this wrong...'],
  },
  urgency: {
    label: 'Urgency',
    description: 'Creates fear of missing out or time pressure',
    examples: ['Only 3 days left...', 'First 50 customers only...'],
  },
  local: {
    label: 'Local Pride',
    description: 'Calls out the viewer by city/area name',
    examples: ['Dharmapuri makkale...', 'Salem la irukeenga-na...'],
  },
  'problem-solution': {
    label: 'Problem-Solution',
    description: 'Identifies a pain point the viewer has',
    examples: ['Unga kannadi power adhigama aagudha?', 'Rent pay pannum pothu...'],
  },
  'social-proof': {
    label: 'Social Proof',
    description: 'Leads with results or customer validation',
    examples: ['500+ customers already...', 'Idha paatha apparam...'],
  },
} as const;

export type HookTypeKey = keyof typeof HOOK_TYPES;
