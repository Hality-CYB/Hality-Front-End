"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type QueryKey = readonly unknown[];

type QueryOptions<T> = {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  enabled?: boolean;
};

type MutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData) => void | Promise<void>;
};

const invalidationListeners = new Set<(queryKey: QueryKey) => void>();

export function invalidateAsyncQueries(queryKey: QueryKey) {
  for (const listener of invalidationListeners) listener(queryKey);
}

function isMatchingKey(queryKey: QueryKey, invalidatedKey: QueryKey) {
  return invalidatedKey.every((part, index) => queryKey[index] === part);
}

export function useAsyncQuery<T>({ queryKey, queryFn, enabled = true }: QueryOptions<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const keyRef = useRef(queryKey);
  const queryFnRef = useRef(queryFn);
  const enabledRef = useRef(enabled);
  const keySignature = JSON.stringify(queryKey);

  useEffect(() => {
    keyRef.current = queryKey;
    queryFnRef.current = queryFn;
    enabledRef.current = enabled;
  }, [enabled, queryFn, queryKey]);

  const load = useCallback(async () => {
    if (!enabledRef.current) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      setData(await queryFnRef.current());
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [keySignature, load]);

  useEffect(() => {
    const listener = (invalidatedKey: QueryKey) => {
      if (isMatchingKey(keyRef.current, invalidatedKey)) void load();
    };
    invalidationListeners.add(listener);
    return () => invalidationListeners.delete(listener);
  }, [load]);

  return { data, error, isLoading, isPending: isLoading, refetch: load };
}

export function useAsyncMutation<TData, TVariables = void>({
  mutationFn,
  onSuccess,
}: MutationOptions<TData, TVariables>) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      setIsPending(true);
      setError(null);
      try {
        const data = await mutationFn(variables);
        await onSuccess?.(data);
        return data;
      } catch (caught) {
        const mutationError = caught instanceof Error ? caught : new Error(String(caught));
        setError(mutationError);
        throw mutationError;
      } finally {
        setIsPending(false);
      }
    },
    [mutationFn, onSuccess],
  );

  const mutate = useCallback(
    (variables: TVariables) => {
      void mutateAsync(variables);
    },
    [mutateAsync],
  );

  return { error, isPending, mutate, mutateAsync };
}
