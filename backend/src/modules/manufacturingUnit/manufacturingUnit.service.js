import { mapPrismaError } from '../../utils/apiError.js';
import { parsePagination, toPage } from '../../utils/pagination.js';
import { serializeManufacturingUnit } from './manufacturingUnit.serializer.js';
import * as manufacturingUnitRepository from './manufacturingUnit.repository.js';

export async function listManufacturingUnits(query = {}) {
  const { page, limit, skip, take } = parsePagination(query);
  const { items, total } = await manufacturingUnitRepository.findAllManufacturingUnits({
    skip,
    take,
  });
  return toPage({
    items: items.map(serializeManufacturingUnit),
    page,
    limit,
    total,
  });
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
