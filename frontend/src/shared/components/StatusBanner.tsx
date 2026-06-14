import { useHealth } from "../hooks/useHealth";

export function StatusBanner() {
  const { data, isError } = useHealth();

  if (isError || data?.ready === false) {
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
        {isError
          ? "Backend недоступен"
          : `API недоступен: ${JSON.stringify({ database: data?.database, redis: data?.redis })}`}
      </div>
    );
  }

  return null;
}
