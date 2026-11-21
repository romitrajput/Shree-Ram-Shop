// Shown on every page of the test environment so nobody confuses it with the live shop.
export function EnvBanner() {
  const env = process.env.APP_ENV;
  if (env !== "test" && env !== "development") return null;
  return (
    <div className="bg-khata px-4 py-1.5 text-center text-sm font-medium text-white">
      {env === "test"
        ? "Test environment – orders and payments here are not real. Approve changes before they go live."
        : "Local development"}
      {process.env.APP_VERSION ? <span className="ml-2 opacity-80">build {process.env.APP_VERSION.slice(0, 7)}</span> : null}
    </div>
  );
}
