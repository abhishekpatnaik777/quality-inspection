import * as skuService from './sku.service.js';

export async function listSkus(req, res) {
  const skus = await skuService.listSkus(req.query);
  res.json(skus);
}

export async function createSku(req, res) {
  const sku = await skuService.createSku(req.validatedBody);
  res.status(201).json(sku);
}
