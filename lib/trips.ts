export const dietaryOptions = [
  { id: 'vegetarian' as const, label: 'Vegetarian', icon: '🥗' },
  { id: 'vegan' as const, label: 'Vegan', icon: '🌱' },
  { id: 'halal' as const, label: 'Halal', icon: '🥩' },
  { id: 'kosher' as const, label: 'Kosher', icon: '✡️' },
  { id: 'gluten-free' as const, label: 'Gluten Free', icon: '🌾' },
  { id: 'none' as const, label: 'No Restrictions', icon: '🍽️' },
];

export const budgetOptions = [
  {
    id: 'budget' as const,
    label: 'Budget Friendly',
    icon: '💰',
    description: 'Affordable adventures',
  },
  { id: 'moderate' as const, label: 'Moderate', icon: '💰💰', description: 'Balanced spending' },
  { id: 'luxury' as const, label: 'Luxury', icon: '💰💰💰', description: 'Premium experiences' },
];
