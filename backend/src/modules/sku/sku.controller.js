import * as skuService from './sku.service.js';

export async function listSkus(_req, res) {
  const skus = await skuService.listSkus();
  res.json(skus);
}

export async function getSku(req, res) {
  const sku = await skuService.getSku(req.validatedParams.id);
  res.json(sku);
}

export async function createSku(req, res) {
  const sku = await skuService.createSku(req.validatedBody);
  res.status(201).json(sku);
}
