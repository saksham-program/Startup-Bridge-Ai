import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Failures (permissions, config, network) are rarely transient: surface them after one retry instead of ~7s of retries.
        retry: 1,
        // Avoid re-requesting the same data on every navigation. All private data is keyed by user id and the whole
        // cache is cleared whenever the signed-in user changes (see AuthSync), so nothing can leak across accounts.
        staleTime: 20_000,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
