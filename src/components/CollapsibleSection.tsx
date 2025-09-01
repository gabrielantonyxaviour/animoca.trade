import { memo, useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

const CollapsibleSection = memo(({
  title,
  children,
  defaultCollapsed = false,
}: CollapsibleSectionProps) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
          {title}
        </h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
        >
          {isCollapsed ? "▼" : "▲"}
        </button>
      </div>
      {!isCollapsed && children}
    </div>
  );
});

CollapsibleSection.displayName = "CollapsibleSection";

export default CollapsibleSection;
