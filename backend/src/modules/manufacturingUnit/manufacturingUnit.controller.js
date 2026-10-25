import * as manufacturingUnitService from './manufacturingUnit.service.js';

export async function listManufacturingUnits(_req, res) {
  const units = await manufacturingUnitService.listManufacturingUnits();
  res.json(units);
}

export async function getManufacturingUnit(req, res) {
  const unit = await manufacturingUnitService.getManufacturingUnit(req.validatedParams.id);
  res.json(unit);
}

export async function createManufacturingUnit(req, res) {
  const unit = await manufacturingUnitService.createManufacturingUnit(req.validatedBody);
  res.status(201).json(unit);
}
