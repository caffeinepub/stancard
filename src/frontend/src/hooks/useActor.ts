import { useActor as useCoreActor } from "@caffeineai/core-infrastructure";
// biome-ignore lint/suspicious/noExplicitAny: createActor returns Backend which is typed as backendInterface
import { createActor } from "../backend";

export function useActor() {
  // biome-ignore lint/suspicious/noExplicitAny: createActor is compatible at runtime; _SERVICE is empty in this project
  return useCoreActor(createActor as any);
}
