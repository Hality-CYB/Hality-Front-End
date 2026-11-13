import { z } from "zod";

/**
 * Alvo de envio direto no formato do presigned POST: `url` (relativa à API no
 * storage local, absoluta no S3) e os `fields` que vão antes do arquivo.
 */
export const alvoDeUploadSchema = z.object({
  url: z.string().min(1),
  fields: z.record(z.string(), z.string()),
});
export type AlvoDeUpload = z.infer<typeof alvoDeUploadSchema>;
