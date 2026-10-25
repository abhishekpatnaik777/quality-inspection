import * as inspectionService from './inspection.service.js';

export async function listInspections(req, res) {
  const inspections = await inspectionService.listInspections(req.query);
  res.json(inspections);
}

export async function listSupervisedInspections(req, res) {
  const result = await inspectionService.listSupervisedInspections(req.query);
  res.json(result);
}

export async function getSupervisedSummary(req, res) {
  const result = await inspectionService.getSupervisedSummary(req.query);
  res.json(result);
}

export async function listOverviewInspections(req, res) {
  const result = await inspectionService.listOverviewInspections(req.query);
  res.json(result);
}

export async function getOverviewSummary(req, res) {
  const result = await inspectionService.getOverviewSummary();
  res.json(result);
}

export async function getEngineerSummary(req, res) {
  const result = await inspectionService.getEngineerSummary(req.query);
  res.json(result);
}

export async function getInspection(req, res) {
  const inspection = await inspectionService.getInspection(req.validatedParams.id);
  res.json(inspection);
}

export async function createInspection(req, res) {
  const { inspection, created } = await inspectionService.createInspection(req.validatedBody);
  res.status(created ? 201 : 200).json(inspection);
}
