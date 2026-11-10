const categoryImages = {
  Electronics: ['photo-1498049794561-7780e7231661', 'Useful tech'],
  'Mobiles & Smartphones': ['photo-1511707171634-5f897ff02aa9', 'Pocket-sized power'],
  'Computers & Laptops': ['photo-1498050108023-c5249f4df085', 'Work, reimagined'],
  Fashion: ['photo-1483985988355-763728e1935b', 'Wear it your way'],
  "Men's Clothing": ['photo-1516257984-b1b4d707412e', 'Everyday, elevated'],
  "Women's Clothing": ['photo-1483985988355-763728e1935b', 'Made to feel good'],
  'Shoes & Footwear': ['photo-1542291026-7eec264c27ff', 'Made to move'],
  Watches: ['photo-1524805444758-089113d48a6d', 'Good timing'],
  'Beauty & Personal Care': ['photo-1596462502278-27bfdc403348', 'A little self-care'],
  'Health & Personal Care': ['photo-1505751172876-fa1923c5c528', 'Feel-good essentials'],
  'Home & Kitchen': ['photo-1616486338812-3dadae4b4ace', 'Make room for good'],
  Furniture: ['photo-1555041469-a586c61ea9bc', 'Comfort that stays'],
  'Home Decor': ['photo-1600210492486-724fe5c67fb0', 'The little details'],
  Grocery: ['photo-1542838132-92c53300491e', 'Good things for the pantry'],
  Books: ['photo-1507842217343-583bb7270b66', 'A good place to get lost'],
  'Sports & Fitness': ['photo-1534438327276-14e5300c3a48', 'Find your momentum'],
  Automotive: ['photo-1492144534655-ae79c964c9d7', 'For the open road'],
  'Toys & Games': ['photo-1558060370-d644479cb6f7', 'Made for play'],
  'Baby Products': ['photo-1519689680058-324335c77eba', 'Little everyday helpers'],
  'Pet Supplies': ['photo-1450778869180-41d0601e046e', 'For your best friend'],
  Jewellery: ['photo-1611652022419-a9419f74343d', 'A little extra sparkle'],
  'Musical Instruments': ['photo-1511379938547-c1f69419868d', 'Find your sound'],
  'Office Products': ['photo-1497366754035-f200968a6e72', 'Make work feel better'],
  'Travel Accessories': ['photo-1488646953014-85cb44e25828', 'Ready when you are'],
  'Tools & Home Improvement': ['photo-1504148455328-c376907d081c', 'Make it your own'],
  'Kitchen Appliances': ['photo-1556911220-bff31c812dba', 'Better everyday cooking'],
  'Large Appliances': ['photo-1584622650111-993a426fbf0a', 'Home, made easier'],
  'Bags & Luggage': ['photo-1553062407-98eeb64c6a62', 'Take the good stuff'],
  'Video Games': ['photo-1535223289827-42f1e9919769', 'Press start'],
  'Movies & Entertainment': ['photo-1489599849927-2ee91cede3ba', 'Settle in']
};

export const productCategories = Object.entries(categoryImages).map(([name, [image, note]]) => ({
  name, image, note
}));

export const productCategoryNames = productCategories.map(category => category.name);
