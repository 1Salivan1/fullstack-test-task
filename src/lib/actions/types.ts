/** Shared shape for every form action, consumed by `useActionState`. */
export type ActionState = {
  error?: string;
  success?: string;
  /** Field-level errors keyed by input name. */
  fieldErrors?: Record<string, string>;
};

export const EMPTY_ACTION_STATE: ActionState = {};
