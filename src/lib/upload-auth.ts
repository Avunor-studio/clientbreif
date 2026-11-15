/** XHR appends repeated headers. Keep all upload authorization in one hook. */
export function tusAuthorization(getToken: () => Promise<string | null>) {
  return {
    onBeforeRequest: async (request: {
      setHeader: (name: string, value: string) => void;
    }) => {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again.");
      request.setHeader("Authorization", `Bearer ${token}`);
    },
  };
}
