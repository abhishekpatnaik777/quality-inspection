import * as productService from './product.service.js';

export async function listProducts(_req, res) {
  const products = await productService.listProducts();
  res.json(products);
}

export async function generateProducts(req, res) {
  const result = await productService.generateProducts(req.validatedBody);
  res.status(201).json(result);
}
