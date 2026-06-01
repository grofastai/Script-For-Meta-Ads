export const NICHES = {
  optical: {
    label: 'Optical Store',
    keywords: ['spectacles', 'glasses', 'eye', 'lens', 'vision', 'frame', 'power'],
  },
  'real-estate': {
    label: 'Real Estate',
    keywords: ['property', 'plot', 'house', 'villa', 'apartment', 'land', 'site'],
  },
  hospital: {
    label: 'Hospital / Clinic',
    keywords: ['health', 'doctor', 'treatment', 'medicine', 'care', 'checkup'],
  },
  education: {
    label: 'Education',
    keywords: ['coaching', 'tuition', 'school', 'college', 'training', 'course', 'exam'],
  },
  restaurant: {
    label: 'Restaurant',
    keywords: ['food', 'dining', 'taste', 'menu', 'hotel', 'biryani', 'meals'],
  },
  clothing: {
    label: 'Clothing / Fashion',
    keywords: ['dress', 'fashion', 'clothes', 'saree', 'textile', 'boutique'],
  },
  jewellery: {
    label: 'Jewellery',
    keywords: ['gold', 'silver', 'jewel', 'wedding', 'ring', 'necklace', 'chain'],
  },
  pharmacy: {
    label: 'Pharmacy',
    keywords: ['medicine', 'pharmacy', 'drug', 'health', 'tablet', 'injection'],
  },
  agency: {
    label: 'Marketing Agency',
    keywords: ['marketing', 'ads', 'social media', 'branding', 'digital', 'leads'],
  },
} as const;

export type NicheKey = keyof typeof NICHES;

export const NICHE_OPTIONS = Object.entries(NICHES).map(([value, data]) => ({
  value,
  label: data.label,
}));
