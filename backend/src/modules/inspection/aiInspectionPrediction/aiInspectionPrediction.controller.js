import * as aiInspectionPredictionService from './aiInspectionPrediction.service.js';

export async function verifyPrediction(req, res) {
  const result = await aiInspectionPredictionService.verifyPrediction({
    inspectionId: req.validatedParams.id,
    predictionId: req.validatedParams.predictionId,
    ...req.validatedBody,
  });
  res.json(result);
}
