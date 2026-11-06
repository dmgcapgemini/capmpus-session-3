import type { ToolResultObject } from "@github/copilot-sdk";

/** A failure the agent can act on: the text goes back to the model. */
export function failure(message: string): ToolResultObject {
  return { textResultForLlm: message, resultType: "failure", error: message };
}

export function isFailure(result: unknown): result is ToolResultObject {
  return (
    typeof result === "object" &&
    result !== null &&
    "resultType" in result &&
    (result as ToolResultObject).resultType !== "success"
  );
}

/** Runs a handler and turns unexpected exceptions into a generic failure without internal details. */
export async function guarded<T>(
  toolName: string,
  log: (message: string, error: unknown) => void,
  body: () => Promise<T | ToolResultObject>,
): Promise<T | ToolResultObject> {
  try {
    return await body();
  } catch (error) {
    log(`Unexpected error in ${toolName}`, error);
    return { ...failure(`Internal error in ${toolName}; see the API log`), error: "tool-internal-error" };
  }
}
