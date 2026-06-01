export const CITIES = {
  dharmapuri: {
    label: 'Dharmapuri',
    psychology_tags: ['trust', 'family', 'local-language', 'discounts', 'social-proof'],
    language_style: 'tanglish' as const,
    district: 'Dharmapuri',
  },
  krishnagiri: {
    label: 'Krishnagiri',
    psychology_tags: ['value', 'community', 'local-pride', 'word-of-mouth'],
    language_style: 'tanglish' as const,
    district: 'Krishnagiri',
  },
  salem: {
    label: 'Salem',
    psychology_tags: ['trust', 'quality', 'price-conscious', 'family'],
    language_style: 'tanglish' as const,
    district: 'Salem',
  },
  chennai: {
    label: 'Chennai',
    psychology_tags: ['convenience', 'status', 'time-saving', 'quality'],
    language_style: 'english' as const,
    district: 'Chennai',
  },
  coimbatore: {
    label: 'Coimbatore',
    psychology_tags: ['business-minded', 'quality', 'innovation'],
    language_style: 'tanglish' as const,
    district: 'Coimbatore',
  },
  hosur: {
    label: 'Hosur',
    psychology_tags: ['value', 'practical', 'industrial'],
    language_style: 'tanglish' as const,
    district: 'Krishnagiri',
  },
  karimangalam: {
    label: 'Karimangalam',
    psychology_tags: ['local-language', 'community', 'trust', 'family'],
    language_style: 'tanglish' as const,
    district: 'Dharmapuri',
  },
  palacode: {
    label: 'Palacode',
    psychology_tags: ['local-language', 'trust', 'family', 'value'],
    language_style: 'tanglish' as const,
    district: 'Dharmapuri',
  },
} as const;

export type CityKey = keyof typeof CITIES;

export const CITY_OPTIONS = Object.entries(CITIES).map(([value, data]) => ({
  value,
  label: data.label,
}));
