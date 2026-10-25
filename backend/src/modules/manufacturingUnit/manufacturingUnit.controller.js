import * as manufacturingUnitService from './manufacturingUnit.service.js';

export async function listManufacturingUnits(req, res) {
  const units = await manufacturingUnitService.listManufacturingUnits(req.query);
  res.json(units);
}

export async function createManufacturingUnit(req, res) {
  const unit = await manufacturingUnitService.createManufacturingUnit(req.validatedBody);
  res.status(201).json(unit);
}
