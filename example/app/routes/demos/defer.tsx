import * as React from "react";
import { defer } from "@remix-run/node";
import { Await, useLoaderData } from "@remix-run/react";

export function meta() {
  return { title: "Deferred Demo" };
}

async function loadSlowDataAsync() {
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  return "slow data";
}

export async function loader() {
  let aStillRunningPromise = loadSlowDataAsync();

  return defer({
    critical: "data",
    slowPromise: aStillRunningPromise,
  });
}

export default function DeferDemo() {
  let data = useLoaderData<typeof loader>();

  return (
    <div className="remix__page">
      <main>
        <h2>Defer!</h2>

        <p>Critical Data: "{data.critical}"</p>
        <p>
          Non-critical Data:{" "}
          <React.Suspense fallback={<span>loading...</span>}>
            <Await
              resolve={data.slowPromise}
              errorElement={<span>failed...</span>}
            >
              {(slowData) => <span>"{slowData}"</span>}
            </Await>
          </React.Suspense>
        </p>
      </main>

      <aside>
        <h3>Additional Resources</h3>
        <ul>
          <li>
            Guide:{" "}
            <a href="https://remix.run/docs/en/v1/utils/defer">
              <code>defer</code>
            </a>
          </li>
          <li>
            API:{" "}
            <a href="https://remix.run/docs/en/v1/components/await">
              <code>Await</code>
            </a>
          </li>
        </ul>
      </aside>
    </div>
  );
}
