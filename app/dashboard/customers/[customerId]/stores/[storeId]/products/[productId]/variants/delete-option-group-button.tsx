"use client";

interface DeleteOptionGroupButtonProps {
  groupName: string;
  action: () => Promise<void>;
}

/**
 * FAZ 2C-2 — same window.confirm() pattern as products' own
 * DeleteProductButton: option_values CASCADE from an option_group delete
 * (migration 0018), so a misclick here takes every value under this
 * group with it. Worth one extra confirmation, same as deleting a
 * product itself.
 */
export function DeleteOptionGroupButton({ groupName, action }: DeleteOptionGroupButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `"${groupName}" seçenek grubunu silmek üzeresiniz. Bu gruba bağlı tüm değerler de silinecek. Bu işlem geri alınamaz. Devam edilsin mi?`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <button type="submit" className="rounded px-2 py-1 text-xs text-red-600 underline-offset-2 hover:underline">
        Sil
      </button>
    </form>
  );
}
