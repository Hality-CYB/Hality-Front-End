import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/** Worker do MSW pro navegador — usado enquanto NEXT_PUBLIC_API_MOCKING=enabled. */
export const worker = setupWorker(...handlers);
