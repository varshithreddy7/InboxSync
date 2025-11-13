interface FilterBarProps {
  account: string;
  folder: string;
  category: string;
  categories: string[];
  onAccountChange: (account: string) => void;
  onFolderChange: (folder: string) => void;
  onCategoryChange: (category: string) => void;
}

export default function FilterBar({
  account,
  folder,
  category,
  categories,
  onAccountChange,
  onFolderChange,
  onCategoryChange,
}: FilterBarProps) {
  return (
    <div className="p-4 border-b space-y-3 bg-white">
      <select
        value={account}
        onChange={(event) => onAccountChange(event.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="account1">Account 1</option>
        <option value="account2">Account 2</option>
      </select>

      <select
        value={folder}
        onChange={(event) => onFolderChange(event.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="INBOX">INBOX</option>
        <option value="SENT">SENT</option>
        <option value="DRAFTS">DRAFTS</option>
        <option value="SPAM">SPAM</option>
        <option value="TRASH">TRASH</option>
      </select>

      <select
        value={category}
        onChange={(event) => onCategoryChange(event.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
    </div>
  );
}
