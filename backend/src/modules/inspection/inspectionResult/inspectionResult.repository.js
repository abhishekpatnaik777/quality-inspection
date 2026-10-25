export async function createInspectionResult(tx, data) {
  return tx.inspectionResult.create({
    data: {
      inspectionId: data.inspectionId,
      aiInspectionPredictionId: data.aiInspectionPredictionId,
      defectType: data.defectType,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    },
  });
}

export async function findResultsByInspectionId(tx, inspectionId) {
  return tx.inspectionResult.findMany({ where: { inspectionId } });
}
