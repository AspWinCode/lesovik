import { useHealth } from "../hooks/useHealth";

export function StatusBanner() {
  const { data, isError } = useHealth();

  if (isError || data?.status === "degraded") {
    return (
      <div
        style={{
          background: "#fee2e2",
          color: "#991b1b",
          padding: "8px 16px",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        {isError ? "Backend недоступен" : `API деградировал: ${JSON.stringify(data?.checks)}`}
      </div>
    );
  }

  return null;
}
