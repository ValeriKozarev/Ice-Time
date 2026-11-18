import { useEffect, useState } from "react";
import { prettifyError } from "zod";
import { ScrapeResult } from "@ice-time/shared";

export type AppLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ScrapeResult };

// this is the function for loading our data from sessions.json
async function loadData(): Promise<ScrapeResult> {
  const res = await fetch(`${import.meta.env.BASE_URL}sessions.json`);

  if (!res.ok) {
    throw new Error(`Failed to load data: ${res.status} ${res.statusText}`);
  }

  // zod helps us detect any data coming into the app at the boundary
  const parsedResData = ScrapeResult.safeParse(await res.json());

  if (!parsedResData.success) {
    throw new Error(
      `Failed to parse data: ${prettifyError(parsedResData.error)}`,
    );
  }

  return parsedResData.data;
}

// we write a custom hook to wrap loading our data, this also lets us call other hooks like useState and useEffect
export function useScrapeResult(): AppLoadState {
  const [state, setState] = useState<AppLoadState>({ status: "loading" });

  useEffect(() => {
    let ignore = false;

    // try to load the data, with a branch for success and failure
    loadData()
      .then((data) => {
        if (!ignore) {
          setState({ status: "ready", data });
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const errMessage =
            err instanceof Error ? err.message : "Unknown error";
          setState({ status: "error", message: errMessage });
        }
      });

    // make sure to have a cleanup when async effects run
    return () => {
      ignore = true;
    };
  }, []);

  return state;
}