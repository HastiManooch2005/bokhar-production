export default function Skeleton({ className = "" }) {
  return (
    <div className={`bg-gray-200 dark:bg-gray-700 rounded-md skeleton ${className}`} />
  );
}
