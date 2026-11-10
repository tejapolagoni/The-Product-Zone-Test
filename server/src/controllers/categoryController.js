import Category from '../models/Category.js';
import Product from '../models/Product.js';

export function validateCategory(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Category details are required.';
  if (typeof input.name !== 'string' || !input.name.trim()) return 'Category name is required.';
  if (input.name.trim().length > 80) return 'Category name must be 80 characters or fewer.';
  if (input.image !== undefined && typeof input.image !== 'string') return 'Category image must be a URL.';
  if (input.image?.trim()) {
    try {
      if (!['http:', 'https:'].includes(new URL(input.image).protocol)) return 'Category image must use HTTP or HTTPS.';
    } catch {
      return 'Enter a valid category image URL.';
    }
  }
  if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 120)) {
    return 'Category note must be 120 characters or fewer.';
  }
  return null;
}

export function categoryFields(input) {
  const name = input.name.trim();
  return {
    name,
    nameKey: name.toLocaleLowerCase('en'),
    ...(input.image !== undefined ? { image: input.image.trim() } : {}),
    ...(input.note !== undefined ? { note: input.note.trim() } : {})
  };
}

export async function listCategories(req, res) {
  const [stored, productCategories] = await Promise.all([
    Category.find().sort({ name: 1 }).lean(),
    Product.distinct('category')
  ]);
  const names = new Set(stored.map(category => category.nameKey || category.name.toLocaleLowerCase('en')));
  const categories = [...stored];
  for (const name of productCategories) {
    const nameKey = name.toLocaleLowerCase('en');
    if (!names.has(nameKey)) {
      categories.push({ name, nameKey, image: '', note: '' });
      names.add(nameKey);
    }
  }
  categories.sort((left, right) => left.name.localeCompare(right.name));
  res.json({ categories });
}

export async function createCategory(req, res) {
  const validationError = validateCategory(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  const fields = categoryFields(req.body);
  if (await Category.exists({ nameKey: fields.nameKey })) {
    return res.status(409).json({ message: 'A category with this name already exists.' });
  }
  const category = await Category.create(fields);
  res.status(201).json({ category });
}

export async function updateCategory(req, res) {
  const validationError = validateCategory(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: 'Category not found.' });

  const fields = categoryFields(req.body);
  const duplicate = await Category.exists({ _id: { $ne: category._id }, nameKey: fields.nameKey });
  if (duplicate) return res.status(409).json({ message: 'A category with this name already exists.' });

  const previousName = category.name;
  const previousNameKey = category.nameKey;
  Object.assign(category, fields);
  await category.save();

  if (previousName !== category.name) {
    try {
      await Product.updateMany({ category: previousName }, { $set: { category: category.name } });
    } catch (error) {
      category.name = previousName;
      category.nameKey = previousNameKey;
      await category.save();
      throw error;
    }
  }
  res.json({ category });
}

export async function deleteCategory(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: 'Category not found.' });
  const productCount = await Product.countDocuments({ category: category.name });
  if (productCount) {
    return res.status(409).json({
      message: `This category has ${productCount} product${productCount === 1 ? '' : 's'}. Reassign or delete them before deleting the category.`
    });
  }
  await Category.deleteOne({ _id: category._id });
  res.json({ message: 'Category deleted.' });
}
