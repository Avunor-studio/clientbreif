export type WorkspaceScope = {
  userId: string;
  sessionId: string;
  orgId: string;
};
type Snapshot<T> = { scopeKey: string | null; data: T | null; error: string };

export function workspaceScopeKey(scope: WorkspaceScope | null) {
  return scope
    ? JSON.stringify([scope.userId, scope.sessionId, scope.orgId])
    : null;
}

// One resource per mounted workspace, held only in memory. Never share this on
// the server or persist agency data in browser storage.
export class WorkspaceResource<T extends { orgId: string }> {
  private scope: WorkspaceScope | null = null;
  private generation = 0;
  private initial: Snapshot<T> = { scopeKey: null, data: null, error: "" };
  private snapshot = this.initial;
  private listeners = new Set<() => void>();
  private inFlight: { generation: number; promise: Promise<void> } | null =
    null;

  constructor(private load: () => Promise<T>) {}

  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => this.initial;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private publish(snapshot: Snapshot<T>) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }

  setScope(scope: WorkspaceScope | null) {
    const scopeKey = workspaceScopeKey(scope);
    if (scopeKey === this.snapshot.scopeKey) return;
    this.scope = scope;
    this.generation++;
    this.inFlight = null;
    this.publish({ scopeKey, data: null, error: "" });
  }

  refresh = (options?: { force?: boolean }): Promise<void> => {
    const scope = this.scope;
    if (!scope) return Promise.resolve();
    // A successful mutation needs a response started after the write, not an
    // already-running navigation refresh that may contain pre-write data.
    if (options?.force && this.inFlight) {
      this.generation++;
      this.inFlight = null;
    }
    const generation = this.generation;
    if (this.inFlight?.generation === generation) return this.inFlight.promise;

    const promise = Promise.resolve()
      .then(this.load)
      .then((data) => {
        if (generation !== this.generation) return;
        if (data.orgId !== scope.orgId) {
          this.publish({
            ...this.snapshot,
            data: null,
            error: "The agency changed while loading. Please retry.",
          });
          return;
        }
        this.publish({ ...this.snapshot, data, error: "" });
      })
      .catch((error: unknown) => {
        if (generation !== this.generation) return;
        const denied =
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          [401, 403].includes(Number(error.status));
        this.publish({
          ...this.snapshot,
          data: denied ? null : this.snapshot.data,
          error:
            error instanceof Error
              ? error.message
              : "Could not refresh the workspace. Please retry.",
        });
      })
      .finally(() => {
        if (this.inFlight?.generation === generation) this.inFlight = null;
      });
    this.inFlight = { generation, promise };
    return promise;
  };
}
