/**
 * Contrato do endpoint GET /api/v1/health do backend.
 * Equivalente aos `schemas/` Pydantic do backend — tipos que espelham
 * o que trafega pela API, não necessariamente o que é salvo no banco.
 */
export interface HealthStatus {
  status: string;
}
