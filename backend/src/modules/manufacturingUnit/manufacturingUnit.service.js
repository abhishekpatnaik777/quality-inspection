import { ApiError, mapPrismaError } from '../../utils/apiError.js';
import { serializeManufacturingUnit } from './manufacturingUnit.serializer.js';
import * as manufacturingUnitRepository from './manufacturingUnit.repository.js';

export async function listManufacturingUnits() {
  const units = await manufacturingUnitRepository.findAllManufacturingUnits();
  return units.map(serializeManufacturingUnit);
}

export async function getManufacturingUnit(id) {
  const unit = await manufacturingUnitRepository.findManufacturingUnitById(id);
  if (!unit) {
    throw new ApiError(404, 'Manufacturing unit not found');
  }
  return serializeManufacturingUnit(unit);
}

export async function createManufacturingUnit(payload) {
  try {
    const unit = await manufacturingUnitRepository.createManufacturingUnit(payload);
    return serializeManufacturingUnit(unit);
  } catch (err) {
    mapPrismaError(err, {
      P2003: {
        statusCode: 400,
        message: 'created_by or updated_by user does not exist',
      },
    });
  }
}
